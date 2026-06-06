import { useState } from 'react'
import { VistaDeZonaDeDrop } from '../contenidos/VistaDeZonaDeDrop'
import { ListaDeArchivosSeleccionados } from '../contenedores/ListaDeArchivosSeleccionados'

export function ControladorDeArchivos() {
  const [esArrastrandoArchivo, setEsArrastrandoArchivo] = useState(false)
  const [listaDeArchivosParaEnviar, setListaDeArchivosParaEnviar] = useState([])

  const manejarEntradaDeArrastre = (evento) => {
    evento.preventDefault()
    setEsArrastrandoArchivo(true)
  }

  const manejarSalidaDeArrastre = (evento) => {
    evento.preventDefault()
    setEsArrastrandoArchivo(false)
  }

  const manejarSoltarArchivos = (evento) => {
    evento.preventDefault()
    setEsArrastrandoArchivo(false)
    
    const archivosNuevos = Array.from(evento.dataTransfer.files)
    
    if (archivosNuevos.length > 0) {
      // Usamos el estado anterior para acumular los archivos en lugar de reemplazarlos
      setListaDeArchivosParaEnviar((archivosPrevios) => [
        ...archivosPrevios,
        ...archivosNuevos
      ])
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div 
        onDragOver={manejarEntradaDeArrastre}
        onDragLeave={manejarSalidaDeArrastre}
        onDrop={manejarSoltarArchivos}
      >
        <VistaDeZonaDeDrop 
          esArrastrando={esArrastrandoArchivo} 
          tieneArchivosSeleccionados={listaDeArchivosParaEnviar.length > 0} 
        />
      </div>

      {listaDeArchivosParaEnviar.length > 0 && (
        <ListaDeArchivosSeleccionados archivos={listaDeArchivosParaEnviar} />
      )}
    </div>
  )
}
