import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import dgram from 'dgram'
import {
  PUERTO_OFICIAL,
  DIRECCION_BROADCAST,
  ALIAS_POR_DEFECTO,
  TIPO_DISPOSITIVO,
  LIMITE_INACTIVIDAD_MS,
  INTERVALO_LIMPIEZA_MS
} from './constantes'

let ventanaPrincipal
let esServidorUdpActivo = false
const servidorUdp = dgram.createSocket('udp4')
const dispositivosDetectados = new Map()

function sincronizarDispositivos() {
  if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
    const listaParaEnviar = Array.from(dispositivosDetectados.values()).map(item => item.datos)
    ventanaPrincipal.webContents.send('actualizar-lista-dispositivos', listaParaEnviar)
  }
}

function iniciarServidores() {
  try {
    servidorUdp.on('message', (mensaje, info) => {
      try {
        const datos = JSON.parse(mensaje.toString())
        if (datos.alias !== ALIAS_POR_DEFECTO) {
          dispositivosDetectados.set(info.address, {
            datos: { ...datos, direccionIp: info.address },
            ultimaVezVisto: Date.now()
          })
          sincronizarDispositivos()
        }
      } catch (error) { /* Paquete inválido ignorado */ }
    })

    servidorUdp.bind(PUERTO_OFICIAL, () => {
      servidorUdp.setBroadcast(true)
      esServidorUdpActivo = true
      
      setInterval(() => {
        const mensaje = JSON.stringify({ alias: ALIAS_POR_DEFECTO, tipo: TIPO_DISPOSITIVO, puerto: PUERTO_OFICIAL })
        if (esServidorUdpActivo) servidorUdp.send(mensaje, PUERTO_OFICIAL, DIRECCION_BROADCAST)
      }, 5000)

      setInterval(() => {
        const ahora = Date.now()
        let huboCambios = false
        for (const [ip, info] of dispositivosDetectados.entries()) {
          if (ahora - info.ultimaVezVisto > LIMITE_INACTIVIDAD_MS) {
            dispositivosDetectados.delete(ip)
            huboCambios = true
          }
        }
        if (huboCambios) sincronizarDispositivos()
      }, INTERVALO_LIMPIEZA_MS)
    })
  } catch (error) {
    esServidorUdpActivo = false
  }
}

ipcMain.handle('obtener-estado-servidor', () => esServidorUdpActivo)

app.whenReady().then(() => {
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

  ventanaPrincipal.on('ready-to-show', () => ventanaPrincipal.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    ventanaPrincipal.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    ventanaPrincipal.loadFile(join(__dirname, '../renderer/index.html'))
  }
  iniciarServidores()
})

app.on('window-all-closed', () => {
  try { servidorUdp.close() } catch (e) {}
  if (process.platform !== 'darwin') app.quit()
})
