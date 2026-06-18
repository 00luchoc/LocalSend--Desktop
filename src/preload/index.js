import { contextBridge, ipcRenderer, webUtils } from 'electron'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('apiExterna', {
      obtenerAliasLocal: () => ipcRenderer.invoke('obtener-alias-local'),
      solicitarEstadoDelServidor: () => ipcRenderer.invoke('obtener-estado-servidor'),
      obtenerRutaReal: (archivo) => webUtils.getPathForFile(archivo),
      responderSolicitud: (respuesta) => ipcRenderer.send('responder-solicitud', respuesta),
      
      alRecibirSolicitud: (callback) => ipcRenderer.on('nueva-solicitud-entrada', (_e, d) => callback(d)),
      alCambiarEstadoNegociacion: (callback) => ipcRenderer.on('estado-negociacion-emisor', (_e, d) => callback(d)),
      alRecibirCambioDeEstado: (callback) => ipcRenderer.on('notificar-estado-servidor', (_e, s) => callback(s)),
      alActualizarListaDispositivos: (callback) => ipcRenderer.on('actualizar-lista-dispositivos', (_e, l) => callback(l)),
      alRecibirProgreso: (callback) => ipcRenderer.on('progreso-transferencia', (_e, d) => callback(d)),
      enviarArchivosADispositivo: (direccionIp, archivos) => ipcRenderer.send('iniciar-envio-archivos', { direccionIp, archivos })
    });
  } catch (e) { console.error('Fallo en Preload:', e) }
}
