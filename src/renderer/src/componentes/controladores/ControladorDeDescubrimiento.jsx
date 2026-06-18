import { useState, useEffect } from 'react'
import { ContenedorDeListaDeDispositivos } from '../contenedores/ContenedorDeListaDeDispositivos'

export function ControladorDeDescubrimiento({ archivosParaEnviar }) {
  const [dispositivosEnRed, setDispositivosEnRed] = useState([])

  useEffect(() => {
    // Escuchamos la actualización constante del Main (Discovery UDP)
    window.apiExterna.alActualizarListaDispositivos((listaActualizada) => {
      setDispositivosEnRed(listaActualizada)
    })
  }, [])

  const manejarEnvio = (direccionIpDestino) => {
    if (archivosParaEnviar.length === 0) {
      alert('Por favor, primero arrastra los archivos que deseas enviar.')
      return
    }

    // Disparamos la lógica de negociación por WebSockets en el Main
    window.apiExterna.enviarArchivosADispositivo(direccionIpDestino, archivosParaEnviar)
  }

  return (
    <div className="panel-descubrimiento">
      <h3>Dispositivos cercanos</h3>
      <ContenedorDeListaDeDispositivos 
        listaDeDispositivos={dispositivosEnRed} 
        alSeleccionar={manejarEnvio}
      />
    </div>
  )
}
