import { useState } from 'react'
import { VistaDeZonaDeDrop } from '../contenidos/VistaDeZonaDeDrop'
import { ListaDeArchivosSeleccionados } from '../contenedores/ListaDeArchivosSeleccionados'

export function ControladorDeArchivos({ alCambiarArchivos }) {
  const [esArrastrando, setEsArrastrando] = useState(false)
  const [listaDeArchivosSeleccionados, setListaDeArchivosSeleccionados] = useState([])

  const manejarSoltarArchivos = (evento) => {
    evento.preventDefault()
    setEsArrastrando(false)
    
    const archivosCapturados = Array.from(evento.dataTransfer.files)
    
    if (archivosCapturados.length > 0) {
      // Método anterior: lectura directa de propiedades del archivo
      const archivosMapeados = archivosCapturados.map((archivo) => ({
        name: archivo.name,
        path: archivo.path, // Al ser sandbox:false, Electron provee la ruta real
        size: archivo.size,
        type: archivo.type || 'Carpeta o archivo de sistema'
      }))

      setListaDeArchivosSeleccionados((previos) => {
        const nuevaLista = [...previos, ...archivosMapeados]
        if (alCambiarArchivos) alCambiarArchivos(nuevaLista)
        return nuevaLista
      })
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div 
        onDragOver={(e) => { e.preventDefault(); setEsArrastrando(true) }}
        onDragLeave={() => setEsArrastrando(false)}
        onDrop={manejarSoltarArchivos}
      >
        <VistaDeZonaDeDrop
          esArrastrando={esArrastrando}
          tieneArchivosSeleccionados={listaDeArchivosSeleccionados.length > 0}
        />
      </div>

      {listaDeArchivosSeleccionados.length > 0 && (
        <ListaDeArchivosSeleccionados archivos={listaDeArchivosSeleccionados} />
      )}
    </div>
  )
}
