export function MonitorDeTransferencia({ nombre, progreso }) {
  return (
    <div className="monitor-transferencia" style={{ marginTop: '10px', padding: '10px', background: '#eee', borderRadius: '8px' }}>
      <small>Enviando: {nombre}</small>
      <div style={{ width: '100%', background: '#ccc', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
        <div style={{ width: `${progreso}%`, background: '#00a693', height: '100%', transition: 'width 0.2s' }}></div>
      </div>
      <small>{progreso}% completado</small>
    </div>
  )
}
