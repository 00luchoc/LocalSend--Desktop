export function TarjetaParaDispositivo({ alias, direccionIp, tipo, alHacerClic }) {
  return (
    <article 
      className="tarjeta-dispositivo" 
      onClick={() => alHacerClic(direccionIp)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ fontSize: '24px' }}>{tipo === 'Smartphone' ? '📱' : '💻'}</div>
      <div>
        <h4>{alias}</h4>
        <small>{direccionIp}</small>
      </div>
    </article>
  )
}
