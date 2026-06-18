import { contextBridge, ipcRenderer, webUtils } from 'electron'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('apiExterna', {
      obtenerAliasLocal: () => ipcRenderer.invoke('obtener-alias-local'),
      solicitarEstadoDelServidor: () => ipcRenderer.invoke('obtener-estado-servidor'),
      
      // FUNCIÓN CRÍTICA: Recupera la ruta real del SO
      obtenerRutaReal: (archivo) => {
        try {
          return webUtils.getPathForFile(archivo)
        } catch (error) {
          // Fallback para versiones antiguas o errores de contexto
          return archivo.path || ''
        }
      },

      alRecibirCambioDeEstado: (callback) => 
        ipcRenderer.on('notificar-estado-servidor', (_e, estado) => callback(estado)),
      alActualizarAlias: (callback) => ipcRenderer.on('configurar-alias-local', (_e, a) => callback(a)),
      alActualizarListaDispositivos: (callback) => ipcRenderer.on('actualizar-lista-dispositivos', (_e, l) => callback(l)),
      alRecibirProgreso: (callback) => ipcRenderer.on('progreso-transferencia', (_e, d) => callback(d)),
      enviarArchivosADispositivo: (direccionIp, archivos) => 
        ipcRenderer.send('iniciar-envio-archivos', { direccionIp, archivos })
    })
  } catch (error) {
    console.error('Error al inicializar el puente de comunicación:', error)
  }
}
