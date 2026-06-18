import { contextBridge, ipcRenderer } from 'electron'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('apiExterna', {
      obtenerAliasLocal: () => ipcRenderer.invoke('obtener-alias-local'),
      solicitarEstadoDelServidor: () => ipcRenderer.invoke('obtener-estado-servidor'),
      alRecibirCambioDeEstado: (callback) => 
        ipcRenderer.on('notificar-estado-servidor', (_evento, estado) => callback(estado)),

      alActualizarAlias: (callback) => ipcRenderer.on('configurar-alias-local', (_e, a) => callback(a)),
      alActualizarListaDispositivos: (callback) => ipcRenderer.on('actualizar-lista-dispositivos', (_e, l) => callback(l)),
      alRecibirProgreso: (callback) => ipcRenderer.on('progreso-transferencia', (_e, d) => callback(d)),
      enviarArchivosADispositivo: (direccionIp, archivos) => 
        ipcRenderer.send('iniciar-envio-archivos', { direccionIp, archivos })
    })
  } catch (error) {
    console.error('Error al exponer la API:', error)
  }
}
