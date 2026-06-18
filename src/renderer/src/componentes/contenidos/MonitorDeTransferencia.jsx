export function MonitorDeTransferencia({ nombre, porcentaje, velocidad, tiempoRestante }) {
  const esFinalizado = porcentaje >= 100

  return (
    <article className="monitor-transferencia" style={{ padding: '15px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <strong>{nombre}</strong>
        <span style={{ color: '#00a693' }}>{porcentaje}%</span>
      </header>

      <div style={{ width: '100%', background: '#eee', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ width: `${porcentaje}%`, background: '#00a693', height: '100%', transition: 'width 0.3s' }} />
      </div>

      {!esFinalizado && (
        <footer style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#666' }}>
          <span>Velocidad: <b>{velocidad} MB/s</b></span>
          <span>Faltan: <b>{tiempoRestante}s</b></span>
        </footer>
      )}
      {esFinalizado && <footer style={{ textAlign: 'center', color: '#2ecc71', fontSize: '0.85em' }}>¡Transferencia Completada!</footer>}
    </article>
  )
}
