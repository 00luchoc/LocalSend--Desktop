import { useState } from 'react'
import { TarjetaDeArchivoSeleccionado } from '../contenidos/TarjetaDeArchivoSeleccionado'
import { IconoCarpeta } from '../contenidos/Iconos'

export function ControladorDeArchivos({ archivos, alCambiarArchivos }) {
  const [esArrastrando, setEsArrastrando] = useState(false);

  const manejarDrop = (e) => {
    e.preventDefault();
    setEsArrastrando(false);
    
    // Captura total de metadatos del archivo
    const nuevosArchivos = Array.from(e.dataTransfer.files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type || 'Archivo/Bin',
      path: window.apiExterna.obtenerRutaReal(f) // Extraemos ruta real para el Main
    }));

    alCambiarArchivos([...archivos, ...nuevosArchivos]);
  };

  return (
    <section className="seccion-archivos">
      <div 
        className={`drop-zone ${esArrastrando ? 'activo' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setEsArrastrando(true) }}
        onDragLeave={() => setEsArrastrando(false)}
        onDrop={manejarDrop}
      >
        <IconoCarpeta />
        <p>{esArrastrando ? '¡Suéltalo aquí!' : 'Arrastra archivos o haz clic para subir'}</p>
      </div>

      <div className="lista-archivos-seleccionados">
        {archivos.map(archivo => (
          <TarjetaDeArchivoSeleccionado 
            key={archivo.name} 
            nombre={archivo.name} 
            tamaño={archivo.size} 
            tipo={archivo.type}
            alEliminar={() => alCambiarArchivos(archivos.filter(a => a.name !== archivo.name))}
          />
        ))}
      </div>
    </section>
  );
}
