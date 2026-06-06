import { useState, useEffect } from 'react'
import { IndicadorDeEstadoDeRed } from '../contenidos/IndicadorDeEstadoDeRed'

export function ControladorDeConectividad() {
  const [estaServidorEnLinea, setEstaServidorEnLinea] = useState(false)

  useEffect(() => {
    // Consulta inicial del estado
    window.apiExterna.solicitarEstadoDelServidor().then(setEstaServidorEnLinea)

    // Suscripción a cambios en tiempo real
    window.apiExterna.alRecibirCambioDeEstado((nuevoEstado) => {
      setEstaServidorEnLinea(nuevoEstado)
    })
  }, [])

  return <IndicadorDeEstadoDeRed esActivo={estaServidorEnLinea} />
}
