import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import dgram from 'dgram'
import { PUERTO_DESCUBRIMIENTO_UDP, ALIAS_POR_DEFECTO, TIPO_DISPOSITIVO } from './constantes'

let ventanaPrincipal
let esServidorUdpActivo = false
const servidorUdp = dgram.createSocket('udp4')

function notificarEstadoALaInterfaz() {
  if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
    ventanaPrincipal.webContents.send('notificar-estado-servidor', esServidorUdpActivo)
  }
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

  ventanaPrincipal.on('ready-to-show', () => ventanaPrincipal.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    ventanaPrincipal.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    ventanaPrincipal.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function iniciarServidorDeDescubrimiento() {
  try {
    servidorUdp.on('message', (mensaje, info) => {
      try {
        const datos = JSON.parse(mensaje.toString())
        if (ventanaPrincipal && datos.alias !== ALIAS_POR_DEFECTO) {
          ventanaPrincipal.webContents.send('dispositivo-encontrado', {
            ...datos,
            direccionIp: info.address
          })
        }
      } catch (error) {
        // Se ignora el error en el parseo de paquetes externos para evitar colapsos
      }
    })

    servidorUdp.bind(PUERTO_DESCUBRIMIENTO_UDP, () => {
      servidorUdp.setBroadcast(true)
      esServidorUdpActivo = true
      notificarEstadoALaInterfaz()
    })
  } catch (error) {
    esServidorUdpActivo = false
  }
}

ipcMain.handle('obtener-estado-servidor', () => esServidorUdpActivo)

app.whenReady().then(() => {
  crearVentanaPrincipal()
  iniciarServidorDeDescubrimiento()
})

app.on('window-all-closed', () => {
  servidorUdp.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
