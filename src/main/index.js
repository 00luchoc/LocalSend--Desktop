import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import dgram from 'dgram'
import http from 'http'
import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import fs from 'fs'
import os from 'os'

// --- CONSTANTES TÉCNICAS (Evitando Números Mágicos) --- [7]
const PUERTO_OFICIAL = 53317
const DIRECCION_BROADCAST = '255.255.255.255'
const LIMITE_INACTIVIDAD_MS = 12000
const INTERVALO_LIMPIEZA_MS = 5000
const ACCION_NEGOCIAR = 'SOLICITAR_TRANSFERENCIA'

// --- ESTADO GLOBAL DEL PROCESO MAIN ---
let ventanaPrincipal
let aliasLocal = ''
let esServidorActivo = false
const servidorUdp = dgram.createSocket('udp4')
const dispositivosDetectados = new Map()

// --- CONFIGURACIÓN DEL SERVIDOR DUAL (Express + WebSockets) --- [1]
const appExpress = express()
const servidorHttp = http.createServer(appExpress)
const servidorWs = new WebSocketServer({ server: servidorHttp })

/**
 * Gestiona la identidad persistente del dispositivo. [2]
 * Genera un alias amigable (Adjetivo + Nombre) si no existe. [8]
 */
function obtenerAliasUnico() {
  const rutaAjustes = join(app.getPath('userData'), 'ajustes.json')
  try {
    if (fs.existsSync(rutaAjustes)) {
      return JSON.parse(fs.readFileSync(rutaAjustes)).alias
    }
  } catch (error) {
    console.error('Error al leer ajustes:', error.message)
  }

  const adjetivos = ['Veloz', 'Alegre', 'Valiente', 'Calmo', 'Brillante']
  const nombres = ['Naranja', 'Halcon', 'Bosque', 'Rayo', 'Oceano']
  const nuevoAlias = `${adjetivos[Math.floor(Math.random() * adjetivos.length)]} ${nombres[Math.floor(Math.random() * nombres.length)]}`
  
  try {
    fs.writeFileSync(rutaAjustes, JSON.stringify({ alias: nuevoAlias }))
  } catch (e) { /* Error de escritura silencioso */ }
  return nuevoAlias
}

/**
 * Obtiene las IPs locales para filtrar el autodescubrimiento.
 */
function obtenerMisDireccionesIp() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(it => it.family === 'IPv4' && !it.internal)
    .map(it => it.address)
}

/**
 * Notifica al proceso Renderer la lista actualizada de dispositivos. [9]
 */
function sincronizarInterfaz() {
  if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
    const lista = Array.from(dispositivosDetectados.values()).map(d => d.datos)
    ventanaPrincipal.webContents.send('actualizar-lista-dispositivos', lista)
  }
}

/**
 * SERVIDOR RECEPTOR: Maneja la entrada de archivos mediante Streams. [2, 3]
 */
function iniciarServidorDeNegociacion() {
  servidorWs.on('connection', (socket) => {
    let flujoEscritura = null

    socket.on('message', (datos, esBinario) => {
      try {
        if (!esBinario) {
          const mensaje = JSON.parse(datos.toString())
          if (mensaje.accion === ACCION_NEGOCIAR) {
            // Se guardará en la carpeta de Descargas por defecto [2]
            const rutaDestino = join(app.getPath('downloads'), mensaje.metadatos.nombre)
            flujoEscritura = fs.createWriteStream(rutaDestino)
            
            ventanaPrincipal.webContents.send('progreso-transferencia', {
              nombre: mensaje.metadatos.nombre,
              porcentaje: 0,
              velocidad: "0.00",
              esRecepcion: true
            })
          }
        } else if (flujoEscritura) {
          flujoEscritura.write(datos) // Escritura directa en disco
        }
      } catch (e) { console.error('Error en recepción:', e.message) }
    })

    socket.on('close', () => { if (flujoEscritura) flujoEscritura.end() })
  })

  servidorHttp.listen(PUERTO_OFICIAL, '0.0.0.0', () => {
    esServidorActivo = true
    if (ventanaPrincipal) ventanaPrincipal.webContents.send('notificar-estado-servidor', true)
  })
}

/**
 * CLIENTE EMISOR: Envía archivos al destino mediante Streams no bloqueantes. [2, 3]
 */
ipcMain.on('iniciar-envio-archivos', (_evento, { direccionIp, archivos }) => {
  archivos.forEach((archivo) => {
    // CLÁUSULA DE GUARDA: Evita el error de ruta undefined [6]
    if (!archivo.path) {
      console.error(`ERROR: No se recibió ruta para ${archivo.name}.`)
      return 
    }

    const socketCliente = new WebSocket(`ws://${direccionIp}:${PUERTO_OFICIAL}`)
    const tiempoInicio = Date.now()

    socketCliente.on('open', () => {
      // 1. Negociación de metadatos [3]
      socketCliente.send(JSON.stringify({
        accion: ACCION_NEGOCIAR,
        metadatos: { nombre: archivo.name, tamaño: archivo.size }
      }))

      // 2. Transferencia fluida (Streams) [3]
      const flujoLectura = fs.createReadStream(archivo.path)
      let bytesEnviadosTotal = 0

      flujoLectura.on('data', (chunk) => {
        bytesEnviadosTotal += chunk.length
        socketCliente.send(chunk)

        // 3. Reporte de progreso real [9]
        const duracion = (Date.now() - tiempoInicio) / 1000
        const velocidad = (bytesEnviadosTotal / (1024 * 1024) / duracion).toFixed(2)
        
        ventanaPrincipal.webContents.send('progreso-transferencia', {
          nombre: archivo.name,
          porcentaje: ((bytesEnviadosTotal / archivo.size) * 100).toFixed(2),
          velocidad: velocidad
        })
      })

      flujoLectura.on('end', () => socketCliente.close())
    })
  })
})

/**
 * DESCUBRIMIENTO UDP: Envía y recibe latidos (beacons) en la red local. [1, 10]
 */
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
    } catch (e) { /* Paquete inválido */ }
  })

  servidorUdp.bind(PUERTO_OFICIAL, '0.0.0.0', () => {
    servidorUdp.setBroadcast(true)
    
    // Latidos de descubrimiento cada 5 segundos [10]
    setInterval(() => {
      if (esServidorActivo) {
        const beacon = JSON.stringify({ alias: aliasLocal, tipo: 'Computadora', puerto: PUERTO_OFICIAL })
        servidorUdp.send(beacon, PUERTO_OFICIAL, DIRECCION_BROADCAST)
      }
    }, 5000)

    // Limpieza de dispositivos inactivos (TTL)
    setInterval(() => {
      const ahora = Date.now()
      let huboCambio = false
      for (const [ip, d] of dispositivosDetectados.entries()) {
        if (ahora - d.ultimaVezVisto > LIMITE_INACTIVIDAD_MS) {
          dispositivosDetectados.delete(ip); huboCambio = true
        }
      }
      if (huboCambio) sincronizarInterfaz()
    }, INTERVALO_LIMPIEZA_MS)
  })
}

/**
 * Inicialización de la Ventana Principal. [1]
 */
function crearVentana() {
  ventanaPrincipal = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, // CRÍTICO: Permite acceder a la propiedad .path en el Renderer [1]
      contextIsolation: true
    }
  })

  ventanaPrincipal.on('ready-to-show', () => {
    ventanaPrincipal.show()
    ventanaPrincipal.webContents.send('configurar-alias-local', aliasLocal)
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    ventanaPrincipal.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    ventanaPrincipal.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// --- CICLO DE VIDA DE LA APP ---
app.whenReady().then(() => {
  aliasLocal = obtenerAliasUnico()
  crearVentana()
  iniciarServidorDeNegociacion()
  iniciarDescubrimientoUdp()
})

// Handlers IPC para comunicación con el Puente Seguro (Preload) [1]
ipcMain.handle('obtener-estado-servidor', () => esServidorActivo)
ipcMain.handle('obtener-alias-local', () => aliasLocal)

app.on('window-all-closed', () => {
  try {
    servidorUdp.close()
    servidorHttp.close()
  } catch (e) { /* Ya cerrados */ }
  if (process.platform !== 'darwin') app.quit()
})
