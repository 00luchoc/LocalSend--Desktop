import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('apiExterna', {
  solicitarEstadoDelServidor: () => ipcRenderer.invoke('obtener-estado-servidor'),
  alRecibirCambioDeEstado: (callback) => 
    ipcRenderer.on('notificar-estado-servidor', (_evento, estado) => callback(estado)),
  alEncontrarDispositivo: (callback) => 
    ipcRenderer.on('dispositivo-encontrado', (_evento, dispositivo) => callback(dispositivo)),
  // Nueva función para iniciar la transferencia
  enviarArchivosADispositivo: (direccionIp, listaDeArchivos) => 
    ipcRenderer.send('iniciar-envio-archivos', { direccionIp, listaDeArchivos })
})
