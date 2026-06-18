import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import dgram from 'dgram'
import http from 'http'
import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import fs from 'fs'
import os from 'os'
import { 
  PUERTO_OFICIAL, DIRECCION_BROADCAST, LIMITE_INACTIVIDAD_MS, 
  INTERVALO_LIMPIEZA_MS, ACCION_SOLICITAR, ACCION_ACEPTAR, ACCION_RECHAZAR 
} from './constantes'

let ventanaPrincipal;
let aliasLocal = '';
let esServidorActivo = false;
const servidorUdp = dgram.createSocket('udp4');
const dispositivosDetectados = new Map();

const appExpress = express();
const servidorHttp = http.createServer(appExpress);
const servidorWs = new WebSocketServer({ server: servidorHttp });

function obtenerAliasUnico() {
  const rutaAjustes = join(app.getPath('userData'), 'ajustes.json');
  try {
    if (fs.existsSync(rutaAjustes)) return JSON.parse(fs.readFileSync(rutaAjustes)).alias;
  } catch (e) { console.error('Error al leer alias') }
  const adjetivos = ['Veloz', 'Alegre', 'Valiente', 'Calmo', 'Brillante'];
  const nombres = ['Naranja', 'Halcon', 'Bosque', 'Rayo', 'Oceano'];
  const nuevoAlias = `${adjetivos[Math.floor(Math.random() * adjetivos.length)]} ${nombres[Math.floor(Math.random() * nombres.length)]}`;
  try { fs.writeFileSync(rutaAjustes, JSON.stringify({ alias: nuevoAlias })) } catch (e) {}
  return nuevoAlias;
}

// --- SERVIDOR RECEPTOR (TCP/WS) ---
function iniciarServidorDeNegociacion() {
  servidorWs.on('connection', (socket) => {
    let flujoEscritura = null;
    let metadatos = null;
    let bytesRecibidos = 0;
    let tiempoInicio = 0;

    socket.on('message', (datos, esBinario) => {
      try {
        if (!esBinario) {
          const mensaje = JSON.parse(datos.toString());
          if (mensaje.accion === ACCION_SOLICITAR) {
            metadatos = mensaje.metadatos;
            // Notificamos la solicitud a la UI
            ventanaPrincipal.webContents.send('nueva-solicitud-entrada', metadatos);

            // Escuchamos la respuesta del usuario (Aceptar/Negar)
            ipcMain.once('responder-solicitud', (_e, { aceptada }) => {
              if (aceptada) {
                tiempoInicio = Date.now();
                const rutaDestino = join(app.getPath('downloads'), metadatos.nombre);
                flujoEscritura = fs.createWriteStream(rutaDestino);
                socket.send(JSON.stringify({ accion: ACCION_ACEPTAR }));
              } else {
                socket.send(JSON.stringify({ accion: ACCION_RECHAZAR }));
                socket.close();
              }
            });
          }
        } else if (flujoEscritura) {
          // RECEPCIÓN DE BYTES: Aquí es donde se informa al monitor
          flujoEscritura.write(datos);
          bytesRecibidos += datos.length;
          
          const duracion = (Date.now() - tiempoInicio) / 1000;
          const velocidad = (bytesRecibidos / (1024 * 1024) / (duracion || 1)).toFixed(2);
          const porcentaje = ((bytesRecibidos / metadatos.size) * 100).toFixed(2);

          // ENVIAR PROGRESO A LA UI (CRÍTICO PARA EL MONITOR)
          ventanaPrincipal.webContents.send('progreso-transferencia', {
            nombre: metadatos.nombre,
            porcentaje: porcentaje,
            velocidad: velocidad,
            esRecepcion: true // Indica a React que es una recepción
          });
        }
      } catch (e) { console.error('Error en flujo de red:', e.message) }
    });

    socket.on('close', () => { 
      if (flujoEscritura) {
        flujoEscritura.end();
        // Forzamos el evento final de éxito si el stream terminó
        ventanaPrincipal.webContents.send('progreso-transferencia', {
          nombre: metadatos.nombre, porcentaje: "100.00", velocidad: "0.00", esRecepcion: true
        });
      }
    });
  });

  servidorHttp.listen(PUERTO_OFICIAL, '0.0.0.0', () => {
    esServidorActivo = true;
    if (ventanaPrincipal) ventanaPrincipal.webContents.send('notificar-estado-servidor', true);
  });
}

// --- CLIENTE EMISOR ---
ipcMain.on('iniciar-envio-archivos', (_e, { direccionIp, archivos }) => {
  archivos.forEach((archivo) => {
    if (!archivo.path) return;
    const socket = new WebSocket(`ws://${direccionIp}:${PUERTO_OFICIAL}`);
    socket.on('open', () => {
      socket.send(JSON.stringify({ accion: ACCION_SOLICITAR, metadatos: { nombre: archivo.name, size: archivo.size } }));
      ventanaPrincipal.webContents.send('estado-negociacion-emisor', { nombre: archivo.name, estado: 'esperando' });
    });

    socket.on('message', (datos) => {
      const respuesta = JSON.parse(datos.toString());
      if (respuesta.accion === ACCION_ACEPTAR) {
        ventanaPrincipal.webContents.send('estado-negociacion-emisor', { nombre: archivo.name, estado: 'aceptada' });
        const tiempoInicio = Date.now();
        const flujoLectura = fs.createReadStream(archivo.path);
        let bytesEnviados = 0;
        
        flujoLectura.on('data', (chunk) => {
          bytesEnviados += chunk.length;
          socket.send(chunk);
          const duracion = (Date.now() - tiempoInicio) / 1000;
          ventanaPrincipal.webContents.send('progreso-transferencia', {
            nombre: archivo.name, 
            porcentaje: ((bytesEnviados / archivo.size) * 100).toFixed(2),
            velocidad: (bytesEnviados / (1024 * 1024) / (duracion || 1)).toFixed(2), 
            esRecepcion: false
          });
        });
        flujoLectura.on('end', () => socket.close());
      } else {
        ventanaPrincipal.webContents.send('estado-negociacion-emisor', { nombre: archivo.name, estado: 'negada' });
      }
    });
  });
});

function iniciarDescubrimientoUdp() {
  servidorUdp.on('message', (msg, info) => {
    try {
      const datos = JSON.parse(msg.toString());
      const misIps = Object.values(os.networkInterfaces()).flat().filter(it => it.family === 'IPv4' && !it.internal).map(it => it.address);
      if (!misIps.includes(info.address)) {
        dispositivosDetectados.set(info.address, { datos: { ...datos, direccionIp: info.address }, ultimaVezVisto: Date.now() });
        ventanaPrincipal.webContents.send('actualizar-lista-dispositivos', Array.from(dispositivosDetectados.values()).map(d => d.datos));
      }
    } catch (e) {}
  });
  servidorUdp.bind(PUERTO_OFICIAL, '0.0.0.0', () => {
    servidorUdp.setBroadcast(true);
    setInterval(() => {
      if (esServidorActivo) {
        const beacon = JSON.stringify({ alias: aliasLocal, tipo: 'Computadora', puerto: PUERTO_OFICIAL });
        servidorUdp.send(beacon, PUERTO_OFICIAL, DIRECCION_BROADCAST);
      }
    }, 5000);
  });
}

app.whenReady().then(() => {
  aliasLocal = obtenerAliasUnico();
  ventanaPrincipal = new BrowserWindow({
    width: 900, height: 670, show: false, autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, contextIsolation: true }
  });
  ventanaPrincipal.on('ready-to-show', () => {
    ventanaPrincipal.show();
    ventanaPrincipal.webContents.send('configurar-alias-local', aliasLocal);
  });
  if (process.env.ELECTRON_RENDERER_URL) ventanaPrincipal.loadURL(process.env.ELECTRON_RENDERER_URL)
  else ventanaPrincipal.loadFile(join(__dirname, '../renderer/index.html'))
  iniciarServidorDeNegociacion();
  iniciarDescubrimientoUdp();
});

ipcMain.handle('obtener-estado-servidor', () => esServidorActivo);
ipcMain.handle('obtener-alias-local', () => aliasLocal);
app.on('window-all-closed', () => app.quit());
