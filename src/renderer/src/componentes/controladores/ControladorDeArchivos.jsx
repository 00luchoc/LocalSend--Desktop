import { useState } from 'react'
import { TarjetaDeArchivoSeleccionado } from '../contenidos/TarjetaDeArchivoSeleccionado'

export function ControladorDeArchivos({ archivos, alCambiarArchivos }) {
  const [esArrastrando, setEsArrastrando] = useState(false)

  const manejarDrop = (evento) => {
    evento.preventDefault()
    setEsArrastrando(false)
    
    const archivosCapturados = Array.from(evento.dataTransfer.files)
    
    // MAPEADO SEGURO: Convertimos el archivo a un objeto simple con su ruta real
    const procesados = archivosCapturados.map(archivo => ({
      name: archivo.name,
      size: archivo.size,
      path: window.apiExterna.obtenerRutaReal(archivo), // <--- SOLUCIÓN AL ERROR
      type: archivo.type || 'Archivo'
    }))

    alCambiarArchivos([...archivos, ...procesados])
  }

  const eliminarArchivo = (nombre) => {
    alCambiarArchivos(archivos.filter(a => a.name !== nombre))
  }

  return (
    <div className="seccion-envio-archivos">
      <div 
        className={`drop-zone ${esArrastrando ? 'activo' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setEsArrastrando(true) }}
        onDragLeave={() => setEsArrastrando(false)}
        onDrop={manejarDrop}
      >
        <span style={{ fontSize: '40px' }}>📁</span>
        <p>{esArrastrando ? '¡Suéltalo!' : 'Arrastra archivos aquí para enviar'}</p>
      </div>

      <div className="lista-archivos-seleccionados" style={{ marginTop: '20px' }}>
        {archivos.map((archivo) => (
          <TarjetaDeArchivoSeleccionado 
            key={archivo.name}
            nombre={archivo.name}
            tamaño={archivo.size}
            alEliminar={() => eliminarArchivo(archivo.name)}
          />
        ))}
      </div>
    </div>
  )
}
