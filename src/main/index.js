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

// --- Variables de Estado Global (Proceso Main) ---
let ventanaPrincipal
let aliasLocal = ''
let esServidorActivo = false
const servidorUdp = dgram.createSocket('udp4')
const dispositivosDetectados = new Map()

// --- Configuración del Servidor Dual (Express + WebSockets) ---
const appExpress = express()
const servidorHttp = http.createServer(appExpress)
const servidorWs = new WebSocketServer({ server: servidorHttp })

/**
 * Gestiona la identidad única del dispositivo persistiendo el alias en disco.
 * Cumple con el requisito de Persistencia de Configuración [8].
 */
function obtenerAliasUnico() {
  const rutaAjustes = join(app.getPath('userData'), 'ajustes.json')
  try {
    if (fs.existsSync(rutaAjustes)) {
      return JSON.parse(fs.readFileSync(rutaAjustes)).alias
    }
  } catch (error) {
    console.error('Error al leer ajustes persistidos:', error.message)
  }

  const adjetivos = ['Veloz', 'Alegre', 'Valiente', 'Calmo', 'Brillante']
  const nombres = ['Naranja', 'Halcon', 'Bosque', 'Rayo', 'Oceano']
  const nuevoAlias = `${adjetivos[Math.floor(Math.random() * adjetivos.length)]} ${nombres[Math.floor(Math.random() * nombres.length)]}`
  
  try {
    fs.writeFileSync(rutaAjustes, JSON.stringify({ alias: nuevoAlias }))
  } catch (error) {
    console.error('No se pudo guardar el alias único:', error.message)
  }
  return nuevoAlias
}

/**
 * Obtiene las direcciones IP locales para evitar el auto-descubrimiento [9].
 */
function obtenerMisDireccionesIp() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(interfaz => interfaz.family === 'IPv4' && !interfaz.internal)
    .map(interfaz => interfaz.address)
}

/**
 * Envía la lista actualizada de dispositivos al proceso Renderer [10].
 */
function sincronizarInterfazConDispositivos() {
  if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
    const listaParaEnviar = Array.from(dispositivosDetectados.values()).map(item => item.datos)
    ventanaPrincipal.webContents.send('actualizar-lista-dispositivos', listaParaEnviar)
  }
}

/**
 * SERVIDOR (Receptor): Maneja la recepción de archivos mediante Streams No Bloqueantes [8].
 */
function iniciarServidorDeNegociacion() {
  servidorWs.on('connection', (socket) => {
    let flujoEscritura = null

    socket.on('message', (datos, esBinario) => {
      try {
        if (!esBinario) {
          const mensaje = JSON.parse(datos.toString())
          if (mensaje.accion === ACCION_NEGOCIAR) {
            // Se prepara la escritura en la carpeta de Descargas del sistema [11]
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
          // Escritura directa de chunks binarios al sistema de archivos [12]
          flujoEscritura.write(datos)
        }
      } catch (error) {
        console.error('Fallo en la recepción del mensaje:', error.message)
      }
    })

    socket.on('close', () => {
      if (flujoEscritura) flujoEscritura.end()
    })
  })

  // Escuchamos en todas las interfaces (0.0.0.0) en el puerto oficial 53317 [13]
  servidorHttp.listen(PUERTO_OFICIAL, '0.0.0.0', () => {
    esServidorActivo = true
    // Notificamos al indicador LED de la interfaz que el servidor está OK [10]
    if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
      ventanaPrincipal.webContents.send('notificar-estado-servidor', true)
    }
  })
}

/**
 * CLIENTE (Emisor): Gestiona el envío de archivos hacia otro dispositivo [12].
 */
ipcMain.on('iniciar-envio-archivos', (_evento, { direccionIp, archivos }) => {
  archivos.forEach((archivo) => {
    // Cláusula de guarda para evitar el error de ruta indefinida (Solución a screenshot) [4]
    if (!archivo.path) {
      console.error(`Ruta inválida para el archivo: ${archivo.name}`)
      return
    }

    const socketCliente = new WebSocket(`ws://${direccionIp}:${PUERTO_OFICIAL}`)
    const tiempoInicio = Date.now()

    socketCliente.on('open', () => {
      // 1. Fase de Negociación: Enviamos metadatos del archivo
      socketCliente.send(JSON.stringify({
        accion: ACCION_NEGOCIAR,
        metadatos: { nombre: archivo.name, tamaño: archivo.size }
      }))

      // 2. Fase de Transferencia: Leemos el archivo en chunks con Streams [12]
      const flujoLectura = fs.createReadStream(archivo.path)
      let bytesEnviadosTotal = 0

      flujoLectura.on('data', (chunk) => {
        bytesEnviadosTotal += chunk.length
        socketCliente.send(chunk)

        // 3. Reporte de métricas en tiempo real para el Monitor de UI [10]
        const duracionActual = (Date.now() - tiempoInicio) / 1000
        const velocidadMBs = (bytesEnviadosTotal / (1024 * 1024) / duracionActual).toFixed(2)
        
        ventanaPrincipal.webContents.send('progreso-transferencia', {
          nombre: archivo.name,
          porcentaje: ((bytesEnviadosTotal / archivo.size) * 100).toFixed(2),
          velocidad: velocidadMBs,
          tiempoRestante: Math.ceil((archivo.size - bytesEnviadosTotal) / (bytesEnviadosTotal / duracionActual))
        })
      })

      flujoLectura.on('end', () => socketCliente.close())
    })

    socketCliente.on('error', (err) => console.error('Error de conexión con el destino:', err.message))
  })
})

/**
 * Descubrimiento UDP: Envía y recibe latidos (beacons) en la red local [9].
 */
function iniciarDescubrimientoUdp() {
  servidorUdp.on('message', (mensaje, infoRemota) => {
    try {
      const datosDelVecino = JSON.parse(mensaje.toString())
      const misIps = obtenerMisDireccionesIp()

      // Filtramos para no agregarnos a nosotros mismos en la lista
      if (!misIps.includes(infoRemota.address)) {
        dispositivosDetectados.set(infoRemota.address, {
          datos: { ...datosDelVecino, direccionIp: infoRemota.address },
          ultimaVezVisto: Date.now()
        })
        sincronizarInterfazConDispositivos()
      }
    } catch (e) { /* Paquete de red inválido ignorado */ }
  })

  servidorUdp.bind(PUERTO_OFICIAL, '0.0.0.0', () => {
    servidorUdp.setBroadcast(true)
    
    // Latido constante cada 5 segundos
    setInterval(() => {
      if (esServidorActivo) {
        const beacon = JSON.stringify({ alias: aliasLocal, tipo: 'Computadora', puerto: PUERTO_OFICIAL })
        servidorUdp.send(beacon, PUERTO_OFICIAL, DIRECCION_BROADCAST)
      }
    }, 5000)

    // Limpieza automática de dispositivos inactivos [9]
    setInterval(() => {
      const ahora = Date.now()
      let huboCambios = false
      for (const [ip, dispositivo] of dispositivosDetectados.entries()) {
        if (ahora - dispositivo.ultimaVezVisto > LIMITE_INACTIVIDAD_MS) {
          dispositivosDetectados.delete(ip)
          huboCambios = true
        }
      }
      if (huboCambios) sincronizarInterfazConDispositivos()
    }, INTERVALO_LIMPIEZA_MS)
  })
}

/**
 * Configuración y creación de la ventana de la aplicación [3].
 */
function crearVentana() {
  ventanaPrincipal = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false // Permite el acceso a la propiedad .path en los archivos arrastrados
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

// --- Ciclo de Vida de la Aplicación ---
app.whenReady().then(() => {
  aliasLocal = obtenerAliasUnico()
  crearVentana()
  iniciarServidorDeNegociacion()
  iniciarDescubrimientoUdp()
})

// Handlers de comunicación para obtener estados iniciales
ipcMain.handle('obtener-estado-servidor', () => esServidorActivo)
ipcMain.handle('obtener-alias-local', () => aliasLocal)

app.on('window-all-closed', () => {
  try {
    servidorUdp.close()
    servidorHttp.close()
  } catch (error) { /* Ya cerrados */ }
  if (process.platform !== 'darwin') app.quit()
})
