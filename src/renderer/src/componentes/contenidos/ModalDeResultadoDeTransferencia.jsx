export function ModalDeResultadoDeTransferencia({ esVisible, nombreArchivo, alCerrar }) {
  if (!esVisible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '30px', borderRadius: '15px',
        position: 'relative', textAlign: 'center', minWidth: '300px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <button 
          onClick={alCerrar}
          style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2em' }}
        >
          ✕
        </button>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
        <h3 style={{ margin: '0 0 10px 0' }}>¡Envío Exitoso!</h3>
        <p style={{ color: '#636e72' }}>El archivo <strong>{nombreArchivo}</strong> se transfirió correctamente.</p>
      </div>
    </div>
  )
}
