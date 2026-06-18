import { useState } from 'react'
import { VistaDeZonaDeDrop } from '../contenidos/VistaDeZonaDeDrop'
import { ListaDeArchivosSeleccionados } from '../contenedores/ListaDeArchivosSeleccionados'

export function ControladorDeArchivos({ alCambiarArchivos }) {
  const [esArrastrando, setEsArrastrando] = useState(false)
  const [archivos, setArchivos] = useState([])

  const manejarSoltarArchivos = (evento) => {
    evento.preventDefault()
    setEsArrastrando(false)
    
    const archivosCapturados = Array.from(evento.dataTransfer.files)
    const procesados = archivosCapturados.map(archivo => ({
      name: archivo.name,
      size: archivo.size,
      path: archivo.path, // <--- EXTRACCIÓN CLAVE DE LA RUTA REAL
      type: archivo.type || 'Archivo'
    }))

    setArchivos(prev => {
      const nueva = [...prev, ...procesados]
      if (alCambiarArchivos) alCambiarArchivos(nueva)
      return nueva
    })
  }

  return (
    <div 
      onDragOver={e => { e.preventDefault(); setEsArrastrando(true) }} 
      onDragLeave={() => setEsArrastrando(false)}
      onDrop={manejarSoltarArchivos}
    >
      <VistaDeZonaDeDrop esArrastrando={esArrastrando} tieneArchivosSeleccionados={archivos.length > 0} />
      {archivos.length > 0 && <ListaDeArchivosSeleccionados archivos={archivos} />}
    </div>
  )
}
