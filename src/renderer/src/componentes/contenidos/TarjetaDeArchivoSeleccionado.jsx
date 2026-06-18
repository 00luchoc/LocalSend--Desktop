export function TarjetaDeArchivoSeleccionado({ nombre, tamaño, alEliminar }) {
  return (
    <article className="tarjeta-archivo" style={{ 
      display: 'flex', justifyContent: 'space-between', padding: '10px', 
      borderBottom: '1px solid #eee', position: 'relative' 
    }}>
      <div>
        <strong>{nombre}</strong>
        <p style={{ fontSize: '0.8em', color: '#666' }}>{(tamaño / 1024).toFixed(2)} KB</p>
      </div>
      <button 
        onClick={alEliminar}
        style={{ 
          background: '#ff7675', color: 'white', border: 'none', 
          borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' 
        }}
      >
        ✕
      </button>
    </article>
  )
}
