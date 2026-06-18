import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import dgram from 'dgram'
import http from 'http'
import express from 'express'
import { WebSocketServer } from 'ws'
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

// Configuración del Servidor Express + HTTP + WS (Propuesta del Prof.)
const appExpress = express()
const servidorHttp = http.createServer(appExpress)
const servidorWs = new WebSocketServer({ server: servidorHttp })

function obtenerAliasUnico() {
  const rutaAjustes = join(app.getPath('userData'), 'ajustes.json')
  try {
    if (fs.existsSync(rutaAjustes)) {
      const datos = JSON.parse(fs.readFileSync(rutaAjustes))
      return datos.alias
    }
  } catch (e) { /* Error de lectura, generamos uno nuevo */ }

  const adjetivos = ['Veloz', 'Alegre', 'Valiente', 'Calmo', 'Brillante']
  const nombres = ['Naranja', 'Halcon', 'Bosque', 'Rayo', 'Oceano']
  const nuevoAlias = `${adjetivos[Math.floor(Math.random() * adjetivos.length)]} ${nombres[Math.floor(Math.random() * nombres.length)]}`
  
  fs.writeFileSync(rutaAjustes, JSON.stringify({ alias: nuevoAlias }))
  return nuevoAlias
}

function obtenerMisDireccionesIp() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(it => it.family === 'IPv4' && !it.internal)
    .map(it => it.address)
}

function sincronizarInterfazConDispositivos() {
  if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
    const lista = Array.from(dispositivosDetectados.values()).map(d => d.datos)
    ventanaPrincipal.webContents.send('actualizar-lista-dispositivos', lista)
  }
}

function iniciarServidorNegociacion() {
  servidorWs.on('connection', (socket) => {
    socket.on('message', (buffer) => {
      try {
        const mensaje = JSON.parse(buffer.toString())
        if (mensaje.accion === ACCION_NEGOCIAR && ventanaPrincipal) {
          ventanaPrincipal.webContents.send('notificar-peticion-entrada', mensaje.metadatos)
        }
      } catch (e) { console.error('Error en protocolo WS') }
    })
  })

  servidorHttp.on('error', (err) => {
    console.error('Fallo en Servidor HTTP/WS:', err.message)
    esServidorActivo = false
  })

  servidorHttp.listen(PUERTO_OFICIAL, '0.0.0.0', () => {
    esServidorActivo = true
    if (ventanaPrincipal) ventanaPrincipal.webContents.send('notificar-estado-servidor', true)
  })
}

function iniciarDescubrimientoUdp() {
  servidorUdp.on('message', (msg, info) => {
    try {
      const datos = JSON.parse(msg.toString())
      const misIps = obtenerMisDireccionesIp()

      // Filtro crítico: Solo agregar si no es mi propia IP
      if (!misIps.includes(info.address)) {
        dispositivosDetectados.set(info.address, {
          datos: { ...datos, direccionIp: info.address },
          ultimaVezVisto: Date.now()
        })
        sincronizarInterfazConDispositivos()
      }
    } catch (e) { /* Beacon inválido */ }
  })

  servidorUdp.bind(PUERTO_OFICIAL, '0.0.0.0', () => {
    servidorUdp.setBroadcast(true)
    
    // Latido constante (Beacon) [5]
    setInterval(() => {
      if (esServidorActivo) {
        const beacon = JSON.stringify({ alias: aliasLocal, tipo: 'Computadora', puerto: PUERTO_OFICIAL })
        servidorUdp.send(beacon, PUERTO_OFICIAL, DIRECCION_BROADCAST)
      }
    }, 5000)

    // Limpieza de dispositivos fantasma (TTL)
    setInterval(() => {
      const ahora = Date.now()
      let huboCambios = false
      for (const [ip, d] of dispositivosDetectados.entries()) {
        if (ahora - d.ultimaVezVisto > LIMITE_INACTIVIDAD_MS) {
          dispositivosDetectados.delete(ip)
          huboCambios = true
        }
      }
      if (huboCambios) sincronizarInterfazConDispositivos()
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

  iniciarServidorNegociacion()
  iniciarDescubrimientoUdp()
})

ipcMain.handle('obtener-estado-servidor', () => esServidorActivo)
ipcMain.handle('obtener-alias-local', () => aliasLocal)

app.on('window-all-closed', () => {
  try { servidorUdp.close(); servidorHttp.close() } catch (e) {}
  if (process.platform !== 'darwin') app.quit()
})
