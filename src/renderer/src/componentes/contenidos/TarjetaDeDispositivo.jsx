export function TarjetaDeDispositivo({ alias, direccionIp, tipo, alHacerClick }) {
  return (
    <article 
      className="tarjeta-dispositivo" 
      onClick={() => alHacerClick(direccionIp)}
      style={{
        padding: '15px',
        margin: '10px 0',
        borderRadius: '12px',
        backgroundColor: '#f8f9fa',
        border: '2px solid #e9ecef',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}
    >
      <div className="icono-dispositivo" style={{ fontSize: '24px' }}>
        {tipo === 'Computadora' ? '💻' : '📱'}
      </div>
      <div className="info-dispositivo">
        <h4 style={{ margin: 0, color: '#2d3436' }}>{alias}</h4>
        <small style={{ color: '#636e72' }}>{direccionIp}</small>
      </div>
    </article>
  )
}

