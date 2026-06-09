import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('apiExterna', {
  solicitarEstadoDelServidor: () => ipcRenderer.invoke('obtener-estado-servidor'),
  alRecibirCambioDeEstado: (callback) =>
    ipcRenderer.on('notificar-estado-servidor', (_evento, estado) => callback(estado)),
  alActualizarListaDispositivos: (callback) =>
    ipcRenderer.on('actualizar-lista-dispositivos', (_evento, lista) => callback(lista)),
  enviarArchivosADispositivo: (direccionIp, archivos) =>
    ipcRenderer.send('iniciar-envio-archivos', { direccionIp, archivos }),
  alRecibirProgreso: (callback) =>
    ipcRenderer.on('progreso-transferencia', (_evento, datos) => callback(datos))
})
