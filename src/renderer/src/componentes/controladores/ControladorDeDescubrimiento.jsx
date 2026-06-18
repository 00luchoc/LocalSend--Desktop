import { useState, useEffect } from 'react'
import { ContenedorDeListaDeDispositivos } from '../contenedores/ContenedorDeListaDeDispositivos'

export function ControladorDeDescubrimiento({ archivosParaEnviar }) {
  const [dispositivosEnRed, setDispositivosEnRed] = useState([])

  useEffect(() => {
    window.apiExterna.alActualizarListaDispositivos((listaActualizada) => {
      setDispositivosEnRed(listaActualizada)
    })
  }, [])

  const manejarSeleccionDeDestino = (direccionIp) => {
    if (archivosParaEnviar.length === 0) {
      alert('Primero selecciona archivos para enviar')
      return
    }

    const archivosFormateados = archivosParaEnviar.map(f => ({
      nombre: f.name,
      ruta: f.path,
      tamanio: f.size
    }))

    window.apiExterna.enviarArchivosADispositivo(direccionIp, archivosFormateados)
  }

  return (
    <ContenedorDeListaDeDispositivos
      listaDeDispositivos={dispositivosEnRed}
      alSeleccionarDispositivo={manejarSeleccionDeDestino}
    />
  )
}
