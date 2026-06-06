import { useState, useEffect } from 'react'
import { ContenedorDeListaDeDispositivos } from '../contenedores/ContenedorDeListaDeDispositivos'

export function ControladorDeDescubrimiento() {
  const [dispositivosEncontrados, setDispositivosEncontrados] = useState([])

  useEffect(() => {
    window.apiExterna.alEncontrarDispositivo((nuevoDispositivo) => {
      setDispositivosEncontrados((prev) => {
        const existe = prev.some(d => d.direccionIp === nuevoDispositivo.direccionIp)
        return existe ? prev : [...prev, nuevoDispositivo]
      })
    })
  }, [])

  return <ContenedorDeListaDeDispositivos listaDeDispositivos={dispositivosEncontrados} />
}
