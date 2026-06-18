export function TarjetaDeDispositivo({ alias, direccionIp, tipo, alHacerClick }) {
  const icono = tipo === 'Computadora' ? '💻' : '📱'
  
  return (
    <article className="tarjeta-dispositivo" onClick={() => alHacerClick(direccionIp)}>
      <div className="icono-circular">{icono}</div>
      <div className="info">
        <h4 style={{ margin: 0 }}>{alias}</h4>
        <small style={{ color: '#b2bec3' }}>{direccionIp}</small>
      </div>
      <div style={{ marginLeft: 'auto', color: '#00a693', fontSize: '12px', fontWeight: 'bold' }}>
        LISTO
      </div>
    </article>
  )
}
