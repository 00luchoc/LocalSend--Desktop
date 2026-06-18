import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import dgram from 'dgram'
import http from 'http'
import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import fs from 'fs'
import os from 'os'
import { 
  PUERTO_OFICIAL, DIRECCION_BROADCAST, 
  LIMITE_INACTIVIDAD_MS, INTERVALO_LIMPIEZA_MS, ACCION_NEGOCIAR 
} from './constantes'

let ventanaPrincipal
let aliasLocal = ''
let esServidorActivo = false
const servidorUdp = dgram.createSocket('udp4')
const dispositivosDetectados = new Map()

const appExpress = express()
const servidorHttp = http.createServer(appExpress)
const servidorWs = new WebSocketServer({ server: servidorHttp })

function obtenerAliasUnico() {
  const rutaAjustes = join(app.getPath('userData'), 'ajustes.json')
  try {
    if (fs.existsSync(rutaAjustes)) return JSON.parse(fs.readFileSync(rutaAjustes)).alias
  } catch (e) { console.error('Error de lectura de alias') }
  const adjetivos = ['Veloz', 'Alegre', 'Valiente', 'Calmo', 'Brillante']
  const nombres = ['Naranja', 'Halcon', 'Bosque', 'Rayo', 'Oceano']
  const nuevoAlias = `${adjetivos[Math.floor(Math.random() * adjetivos.length)]} ${nombres[Math.floor(Math.random() * nombres.length)]}`
  try { fs.writeFileSync(rutaAjustes, JSON.stringify({ alias: nuevoAlias })) } catch (e) {}
  return nuevoAlias
}

// --- LOGICA DE RECEPCIÓN (SERVIDOR) CON PROGRESO CORREGIDO ---
function iniciarServidorDeNegociacion() {
  servidorWs.on('connection', (socket) => {
    let flujoEscritura = null
    let nombreArchivo = ''
    let tamañoTotal = 0
    let bytesRecibidos = 0
    let tiempoInicio = 0

    socket.on('message', (datos, esBinario) => {
      try {
        if (!esBinario) {
          const mensaje = JSON.parse(datos.toString())
          if (mensaje.accion === ACCION_NEGOCIAR) {
            nombreArchivo = mensaje.metadatos.nombre
            tamañoTotal = mensaje.metadatos.tamaño
            bytesRecibidos = 0
            tiempoInicio = Date.now()

            const rutaDestino = join(app.getPath('downloads'), nombreArchivo)
            flujoEscritura = fs.createWriteStream(rutaDestino)
            
            // Notificamos inicio al Renderer
            ventanaPrincipal.webContents.send('progreso-transferencia', {
              nombre: nombreArchivo, porcentaje: 0, velocidad: "0.00", esRecepcion: true
            })
          }
        } else if (flujoEscritura) {
          // Escribimos el fragmento binario
          flujoEscritura.write(datos)
          bytesRecibidos += datos.length

          // CÁLCULO DE PROGRESO PARA EL RECEPTOR
          const duracion = (Date.now() - tiempoInicio) / 1000
          const velocidad = (bytesRecibidos / (1024 * 1024) / (duracion || 1)).toFixed(2)
          const porcentaje = ((bytesRecibidos / tamañoTotal) * 100).toFixed(2)

          // Enviamos actualización constante a la UI [5]
          ventanaPrincipal.webContents.send('progreso-transferencia', {
            nombre: nombreArchivo,
            porcentaje: porcentaje,
            velocidad: velocidad,
            esRecepcion: true
          })
        }
      } catch (e) { console.error('Error en el flujo de recepción:', e.message) }
    })

    socket.on('close', () => { if (flujoEscritura) flujoEscritura.end() })
  })

  servidorHttp.listen(PUERTO_OFICIAL, '0.0.0.0', () => {
    esServidorActivo = true
    if (ventanaPrincipal) ventanaPrincipal.webContents.send('notificar-estado-servidor', true)
  })
}

// --- LOGICA DE ENVÍO (CLIENTE) ---
ipcMain.on('iniciar-envio-archivos', (_e, { direccionIp, archivos }) => {
  archivos.forEach((archivo) => {
    if (!archivo.path) return 
    const socketCliente = new WebSocket(`ws://${direccionIp}:${PUERTO_OFICIAL}`)
    const tiempoInicio = Date.now()

    socketCliente.on('open', () => {
      socketCliente.send(JSON.stringify({
        accion: ACCION_NEGOCIAR,
        metadatos: { nombre: archivo.name, tamaño: archivo.size }
      }))

      const flujoLectura = fs.createReadStream(archivo.path)
      let bytesEnviados = 0
      flujoLectura.on('data', (chunk) => {
        bytesEnviados += chunk.length
        socketCliente.send(chunk)
        const duracion = (Date.now() - tiempoInicio) / 1000
        const velocidad = (bytesEnviados / (1024 * 1024) / (duracion || 1)).toFixed(2)
        ventanaPrincipal.webContents.send('progreso-transferencia', {
          nombre: archivo.name, porcentaje: ((bytesEnviados / archivo.size) * 100).toFixed(2), velocidad: velocidad
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
      const misIps = Object.values(os.networkInterfaces()).flat()
        .filter(it => it.family === 'IPv4' && !it.internal).map(it => it.address)
      if (!misIps.includes(info.address)) {
        dispositivosDetectados.set(info.address, {
          datos: { ...datos, direccionIp: info.address }, ultimaVezVisto: Date.now()
        })
        const lista = Array.from(dispositivosDetectados.values()).map(d => d.datos)
        ventanaPrincipal.webContents.send('actualizar-lista-dispositivos', lista)
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
  })
}

app.whenReady().then(() => {
  aliasLocal = obtenerAliasUnico()
  ventanaPrincipal = new BrowserWindow({
    width: 900, height: 670, show: false, autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, contextIsolation: true
    }
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
app.on('window-all-closed', () => app.quit())
