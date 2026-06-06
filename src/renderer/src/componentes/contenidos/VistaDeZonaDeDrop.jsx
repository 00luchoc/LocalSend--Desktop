export function VistaDeZonaDeDrop({ esArrastrando, tieneArchivosSeleccionados }) {
  const claseContenedor = `zona-de-arrastre ${esArrastrando ? 'zona-de-arrastre-activa' : ''}`

  return (
    <div className={claseContenedor}>
      <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
      <p className="texto-informativo">
        {tieneArchivosSeleccionados 
          ? 'Archivos listos para enviar' 
          : 'Arrastra tus archivos aquí o haz clic para seleccionar'}
      </p>
    </div>
  )
}
