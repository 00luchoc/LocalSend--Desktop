import { useState, useEffect } from 'react'
import { ContenedorDeListaDeDispositivos } from '../contenedores/ContenedorDeListaDeDispositivos'

export function ControladorDeDescubrimiento({ archivosParaEnviar }) {
  const [dispositivos, setDispositivos] = useState([])

  useEffect(() => {
    window.apiExterna.alActualizarListaDispositivos(setDispositivos)
  }, [])

  const manejarEnvio = (ip) => {
    if (archivosParaEnviar.length > 0) {
      window.apiExterna.enviarArchivosADispositivo(ip, archivosParaEnviar)
    }
  }

  return (
    <ContenedorDeListaDeDispositivos 
      listaDeDispositivos={dispositivos} 
      alSeleccionar={manejarEnvio} 
    />
  )
}
