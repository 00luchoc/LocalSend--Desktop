import { useState, useEffect } from 'react'

export function ControladorDeConectividad() {
  const [esServidorActivo, setEsServidorActivo] = useState(false)

  useEffect(() => {
    // Verificamos el estado inicial al arrancar
    if (window.apiExterna) {
      window.apiExterna.solicitarEstadoDelServidor().then(setEsServidorActivo)
      
      // Escuchamos actualizaciones en tiempo real (LED Verde/Rojo)
      window.apiExterna.alRecibirCambioDeEstado((estado) => {
        setEsServidorActivo(estado)
      })
    }
  }, [])

  return (
    <div className="indicador-conectividad">
      <div className={`led ${esServidorActivo ? 'led-verde' : 'led-rojo'}`}></div>
      <span className="texto-estado">
        {esServidorActivo ? 'CONECTADO' : 'DESCONECTADO'}
      </span>
    </div>
  )
}
