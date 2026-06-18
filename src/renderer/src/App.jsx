import { useState, useEffect } from 'react'
import './App.css'
import { ControladorDeConectividad } from './componentes/controladores/ControladorDeConectividad'
import { ControladorDeDescubrimiento } from './componentes/controladores/ControladorDeDescubrimiento'
import { ControladorDeArchivos } from './componentes/controladores/ControladorDeArchivos'
import { ModalDeResultadoDeTransferencia } from './componentes/contenidos/ModalDeResultadoDeTransferencia'
import { MonitorDeTransferencia } from './componentes/contenidos/MonitorDeTransferencia'

function App() {
  const [aliasPropio, setAliasPropio] = useState('...')
  const [archivosGlobales, setArchivosGlobales] = useState([]) // Única fuente de verdad
  const [progreso, setProgreso] = useState(null)
  const [esVisibleExito, setEsVisibleExito] = useState(false)

  useEffect(() => {
    window.apiExterna.obtenerAliasLocal().then(setAliasPropio)
    window.apiExterna.alRecibirProgreso((datos) => {
      setProgreso(datos)
      if (parseFloat(datos.porcentaje) >= 100) {
        setArchivosGlobales(prev => prev.filter(a => a.name !== datos.nombre))
        setEsVisibleExito(true)
        setTimeout(() => setProgreso(null), 3000)
      }
    })
  }, [])

  return (
    <main className="aplicacion-principal">
      <ModalDeResultadoDeTransferencia 
        esVisible={esVisibleExito} 
        alCerrar={() => setEsVisibleExito(false)} 
      />

      <header className="cabecera-app">
        <div className="identidad">
          <h1>LocalSend</h1>
          <div className="badge-alias">Tu alias: <span>{aliasPropio}</span></div>
        </div>
        <ControladorDeConectividad />
      </header>
      
      <div className="layout-principal">
        <section className="area-envio">
          {/* Le pasamos la lista y la función para cambiarla */}
          <ControladorDeArchivos 
            archivos={archivosGlobales} 
            alCambiarArchivos={setArchivosGlobales} 
          />
          {progreso && <MonitorDeTransferencia {...progreso} />}
        </section>

        <aside className="panel-dispositivos">
          <div className="titulo-seccion">
            <h3>Dispositivos Cercanos</h3>
            <span className="radar-icon">📡</span>
          </div>
          <ControladorDeDescubrimiento archivosParaEnviar={archivosGlobales} />
        </aside>
      </div>
    </main>
  )
}

export default App
