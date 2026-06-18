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

// Configuración del Servidor Dual (Express + WebSockets) según propuesta docente
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
  } catch (error) {
    console.error('Error al leer ajustes, generando alias nuevo')
  }

  const adjetivos = ['Veloz', 'Alegre', 'Valiente', 'Calmo', 'Brillante']
  const nombres = ['Naranja', 'Halcon', 'Bosque', 'Rayo', 'Oceano']
  const nuevoAlias = `${adjetivos[Math.floor(Math.random() * adjetivos.length)]} ${nombres[Math.floor(Math.random() * nombres.length)]}`
  
  try {
    fs.writeFileSync(rutaAjustes, JSON.stringify({ alias: nuevoAlias }))
  } catch (error) {
    console.error('No se pudo persistir el alias')
  }
  return nuevoAlias
}

function obtenerMisDireccionesIp() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(interfaz => interfaz.family === 'IPv4' && !interfaz.internal)
    .map(interfaz => interfaz.address)
}

function sincronizarInterfazConDispositivos() {
  if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
    const listaParaEnviar = Array.from(dispositivosDetectados.values()).map(item => item.datos)
    ventanaPrincipal.webContents.send('actualizar-lista-dispositivos', listaParaEnviar)
  }
}

function iniciarServidorDeNegociacion() {
  servidorWs.on('connection', (socket) => {
    socket.on('message', (bufferDeDatos) => {
      try {
        const mensaje = JSON.parse(bufferDeDatos.toString())
        if (mensaje.accion === ACCION_NEGOCIAR && ventanaPrincipal) {
          // Notifica al Renderer para mostrar el modal de Aceptar/Rechazar
          ventanaPrincipal.webContents.send('notificar-peticion-entrada', mensaje.metadatos)
        }
      } catch (error) {
        console.error('Error en el protocolo de negociación WS')
      }
    })
  })

  servidorHttp.on('error', (errorDeRed) => {
    console.error('Fallo crítico en Servidor de Negociación:', errorDeRed.message)
    esServidorActivo = false
  })

  // Escuchamos en todas las interfaces para permitir conexión desde otros dispositivos
  servidorHttp.listen(PUERTO_OFICIAL, '0.0.0.0', () => {
    esServidorActivo = true
    console.log(`Servidor Express/WS activo en puerto ${PUERTO_OFICIAL}`)
  })
}

function iniciarDescubrimientoUdp() {
  servidorUdp.on('message', (mensajeRecibido, infoRemota) => {
    try {
      const datosDelDispositivo = JSON.parse(mensajeRecibido.toString())
      const misIps = obtenerMisDireccionesIp()

      // Filtro de IP para evitar el auto-descubrimiento
      if (!misIps.includes(infoRemota.address)) {
        dispositivosDetectados.set(infoRemota.address, {
          datos: { ...datosDelDispositivo, direccionIp: infoRemota.address },
          ultimaVezVisto: Date.now()
        })
        sincronizarInterfazConDispositivos()
      }
    } catch (error) {
      /* Beacon inválido o corrupto ignorado */
    }
  })

  servidorUdp.bind(PUERTO_OFICIAL, '0.0.0.0', () => {
    servidorUdp.setBroadcast(true)
    
    // Latidos (Beacons) para que otros nos encuentren
    setInterval(() => {
      if (esServidorActivo) {
        const beacon = JSON.stringify({ 
          alias: aliasLocal, 
          tipo: 'Computadora', 
          puerto: PUERTO_OFICIAL 
        })
        servidorUdp.send(beacon, PUERTO_OFICIAL, DIRECCION_BROADCAST)
      }
    }, 5000)

    // Limpieza de dispositivos inactivos (TTL)
    setInterval(() => {
      const ahora = Date.now()
      let huboCambios = false
      for (const [ip, info] of dispositivosDetectados.entries()) {
        if (ahora - info.ultimaVezVisto > LIMITE_INACTIVIDAD_MS) {
          dispositivosDetectados.delete(ip)
          huboCambios = true
        }
      }
      if (huboCambios) sincronizarInterfazConDispositivos()
    }, INTERVALO_LIMPIEZA_MS)
  })
}

function crearVentanaPrincipal() {
  ventanaPrincipal = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
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

app.whenReady().then(() => {
  // Inicialización de identidad y servicios
  aliasLocal = obtenerAliasUnico()
  crearVentanaPrincipal()
  iniciarServidorDeNegociacion()
  iniciarDescubrimientoUdp()
})

// Handlers para el puente seguro (Preload)
ipcMain.handle('obtener-estado-servidor', () => esServidorActivo)
ipcMain.handle('obtener-alias-local', () => aliasLocal)

ipcMain.on('iniciar-envio-archivos', (_evento, { direccionIp, archivos }) => {
  archivos.forEach((archivo) => {
    // Aquí se dispara el flujo de transferencia TCP/Streams hacia el destino
    console.log(`Iniciando transferencia de ${archivo.name} hacia ${direccionIp}`)
    
    // Notificación inicial de progreso a la interfaz
    ventanaPrincipal.webContents.send('progreso-transferencia', {
      nombre: archivo.name,
      porcentaje: 0,
      velocidad: "0.00",
      tiempoRestante: "Calculando..."
    })
  })
})

app.on('window-all-closed', () => {
  try {
    servidorUdp.close()
    servidorHttp.close()
  } catch (error) {
    /* Ya cerrado */
  }
  if (process.platform !== 'darwin') app.quit()
})
