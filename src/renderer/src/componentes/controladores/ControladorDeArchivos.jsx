import { useState } from 'react'

export function ControladorDeArchivos({ archivos, alCambiarArchivos }) {
  const [esArrastrando, setEsArrastrando] = useState(false);

  const manejarDrop = (e) => {
    e.preventDefault(); setEsArrastrando(false);
    const nuevos = Array.from(e.dataTransfer.files).map(f => ({
      name: f.name, size: f.size, path: window.apiExterna.obtenerRutaReal(f)
    }));
    alCambiarArchivos([...archivos, ...nuevos]);
  };

  return (
    <div className="seccion-archivos">
      <div className={`drop-zone ${esArrastrando ? 'activo' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setEsArrastrando(true) }}
        onDragLeave={() => setEsArrastrando(false)}
        onDrop={manejarDrop}>
        <p>Arrastra archivos o haz clic aquí</p>
      </div>
      <div className="lista-stack">
        {archivos.map(a => (
          <div key={a.name} className="tarjeta-archivo">
            <span>{a.name}</span>
            <button className="boton-eliminar" onClick={() => alCambiarArchivos(archivos.filter(i => i.name !== a.name))}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
