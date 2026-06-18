import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import dgram from 'dgram'
import http from 'http'
import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import fs from 'fs'
import os from 'os'
import { 
  PUERTO_OFICIAL, 
  DIRECCION_BROADCAST,
  LIMITE_INACTIVIDAD_MS, 
  INTERVALO_LIMPIEZA_MS,
  ACCION_NEGOCIAR
} from './constantes'

let ventanaPrincipal
let aliasLocal = ''
let esServidorActivo = false
const servidorUdp = dgram.createSocket('udp4')
const dispositivosDetectados = new Map()

// Configuración del Servidor Dual (Express + WebSockets)
const appExpress = express()
const servidorHttp = http.createServer(appExpress)
const servidorWs = new WebSocketServer({ server: servidorHttp })

function obtenerAliasUnico() {
  const rutaAjustes = join(app.getPath('userData'), 'ajustes.json')
  try {
    if (fs.existsSync(rutaAjustes)) {
      return JSON.parse(fs.readFileSync(rutaAjustes)).alias
    }
  } catch (error) { console.error('Error al leer ajustes') }

  const adjetivos = ['Veloz', 'Alegre', 'Valiente', 'Calmo', 'Brillante']
  const nombres = ['Naranja', 'Halcon', 'Bosque', 'Rayo', 'Oceano']
  const nuevoAlias = `${adjetivos[Math.floor(Math.random() * adjetivos.length)]} ${nombres[Math.floor(Math.random() * nombres.length)]}`
  
  try { fs.writeFileSync(rutaAjustes, JSON.stringify({ alias: nuevoAlias })) } catch (e) {}
  return nuevoAlias
}

function obtenerMisDireccionesIp() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(it => it.family === 'IPv4' && !it.internal)
    .map(it => it.address)
}

function sincronizarInterfaz() {
  if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
    const lista = Array.from(dispositivosDetectados.values()).map(item => item.datos)
    ventanaPrincipal.webContents.send('actualizar-lista-dispositivos', lista)
  }
}

// --- LOGICA DE RECEPCIÓN (SERVIDOR) ---
function iniciarServidorDeNegociacion() {
  servidorWs.on('connection', (socket) => {
    let flujoEscritura = null
    let nombreArchivo = ''

    socket.on('message', (datos, esBinario) => {
      try {
        if (!esBinario) {
          const mensaje = JSON.parse(datos.toString())
          if (mensaje.accion === ACCION_NEGOCIAR) {
            nombreArchivo = mensaje.metadatos.nombre
            // Notificamos al receptor para mostrar el monitor [6]
            ventanaPrincipal.webContents.send('progreso-transferencia', {
              nombre: nombreArchivo,
              porcentaje: 0,
              velocidad: "0.00",
              esRecepcion: true
            })
            
            // Preparamos el archivo en Descargas [4, 5]
            const rutaDestino = join(app.getPath('downloads'), nombreArchivo)
            flujoEscritura = fs.createWriteStream(rutaDestino)
          }
        } else if (flujoEscritura) {
          // Si es binario, lo escribimos directamente al disco (Stream) [4, 7]
          flujoEscritura.write(datos)
        }
      } catch (error) { console.error('Error en recepción:', error.message) }
    });

    socket.on('close', () => {
      if (flujoEscritura) flujoEscritura.end()
    })
  })

  servidorHttp.listen(PUERTO_OFICIAL, '0.0.0.0', () => {
    esServidorActivo = true
  })
}

// --- LOGICA DE ENVÍO (CLIENTE) ---
ipcMain.on('iniciar-envio-archivos', (_evento, { direccionIp, archivos }) => {
  archivos.forEach((archivo) => {
    // Establecemos conexión WebSocket con el destino [1, 7]
    const socketCliente = new WebSocket(`ws://${direccionIp}:${PUERTO_OFICIAL}`)
    const tiempoInicio = Date.now()

    socketCliente.on('open', () => {
      // 1. Enviamos metadatos para negociar [7]
      socketCliente.send(JSON.stringify({
        accion: ACCION_NEGOCIAR,
        metadatos: { nombre: archivo.name, tamaño: archivo.size }
      }))

      // 2. Iniciamos el Stream de lectura (No bloqueante) [4, 7]
      const flujoLectura = fs.createReadStream(archivo.path)
      let bytesEnviados = 0

      flujoLectura.on('data', (fragmento) => {
        bytesEnviados += fragmento.length
        socketCliente.send(fragmento) // Enviamos binario

        // 3. Reportamos progreso real al Monitor de UI [6]
        const duracion = (Date.now() - tiempoInicio) / 1000
        const velocidad = (bytesEnviados / (1024 * 1024) / duracion).toFixed(2)
        
        ventanaPrincipal.webContents.send('progreso-transferencia', {
          nombre: archivo.name,
          porcentaje: ((bytesEnviados / archivo.size) * 100).toFixed(2),
          velocidad: velocidad,
          tiempoRestante: Math.ceil((archivo.size - bytesEnviados) / (bytesEnviados / duracion))
        })
      })

      flujoLectura.on('end', () => socketCliente.close())
    })
  })
})

function iniciarDescubrimientoUdp() {
  servidorUdp.on('message', (msg, info) => {
    try {
      const datos = JSON.parse(msg.toString())
      if (!obtenerMisDireccionesIp().includes(info.address)) {
        dispositivosDetectados.set(info.address, {
          datos: { ...datos, direccionIp: info.address },
          ultimaVezVisto: Date.now()
        })
        sincronizarInterfaz()
      }
    } catch (e) {}
  })

  servidorUdp.bind(PUERTO_OFICIAL, '0.0.0.0', () => {
    servidorUdp.setBroadcast(true)
    setInterval(() => {
      if (esServidorActivo) {
        const beacon = JSON.stringify({ alias: aliasLocal, tipo: 'Computadora', puerto: PUERTO_OFICIAL })
        servidorUdp.send(beacon, PUERTO_OFICIAL, DIRECCION_BROADCAST)
      }
    }, 5000)
    
    setInterval(() => {
      const ahora = Date.now()
      let cambio = false
      for (const [ip, d] of dispositivosDetectados.entries()) {
        if (ahora - d.ultimaVezVisto > LIMITE_INACTIVIDAD_MS) {
          dispositivosDetectados.delete(ip)
          cambio = true
        }
      }
      if (cambio) sincronizarInterfaz()
    }, INTERVALO_LIMPIEZA_MS)
  })
}

app.whenReady().then(() => {
  aliasLocal = obtenerAliasUnico()
  ventanaPrincipal = new BrowserWindow({
    width: 900, height: 670, show: false, autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false }
  })
  ventanaPrincipal.on('ready-to-show', () => {
    ventanaPrincipal.show()
    ventanaPrincipal.webContents.send('configurar-alias-local', aliasLocal)
  })
  if (process.env.ELECTRON_RENDERER_URL) ventanaPrincipal.loadURL(process.env.ELECTRON_RENDERER_URL)
  else ventanaPrincipal.loadFile(join(__dirname, '../renderer/index.html'))

  iniciarServidorDeNegociacion()
  iniciarDescubrimientoUdp()
})

ipcMain.handle('obtener-estado-servidor', () => esServidorActivo)
ipcMain.handle('obtener-alias-local', () => aliasLocal)

app.on('window-all-closed', () => {
  try { servidorUdp.close(); servidorHttp.close() } catch (e) {}
  if (process.platform !== 'darwin') app.quit()
})
