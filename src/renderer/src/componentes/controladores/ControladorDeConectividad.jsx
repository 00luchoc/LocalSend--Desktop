import { useState, useEffect } from 'react'

export function ControladorDeConectividad() {
  const [esServidorActivo, setEsServidorActivo] = useState(false)

  useEffect(() => {
    // Consultamos el estado inicial
    window.apiExterna.solicitarEstadoDelServidor().then(setEsServidorActivo)

    // Escuchamos cambios en tiempo real del servidor UDP/TCP
    window.apiExterna.alRecibirCambioDeEstado((nuevoEstado) => {
      setEsServidorActivo(nuevoEstado)
    })
  }, [])

  return (
    <div className="indicador-conexion">
      <div className={`led ${esServidorActivo ? 'led-verde' : 'led-rojo'}`}></div>
      <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
        {esServidorActivo ? 'SERVIDOR ACTIVO' : 'RECONECTANDO...'}
      </span>
    </div>
  )
}
