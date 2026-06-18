import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('apiExterna', {
  obtenerAliasLocal: () => ipcRenderer.invoke('obtener-alias-local'),
  solicitarEstadoDelServidor: () => ipcRenderer.invoke('obtener-estado-servidor'),
  alActualizarAlias: (callback) => ipcRenderer.on('configurar-alias-local', (_e, alias) => callback(alias)),
  alActualizarListaDispositivos: (callback) => 
    ipcRenderer.on('actualizar-lista-dispositivos', (_e, lista) => callback(lista)),
  alRecibirPeticionTransferencia: (callback) => 
    ipcRenderer.on('notificar-peticion-entrada', (_e, metadatos) => callback(metadatos)),
  alRecibirCambioDeEstado: (callback) => 
    ipcRenderer.on('notificar-estado-servidor', (_e, estado) => callback(estado))
})
