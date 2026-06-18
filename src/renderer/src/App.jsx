import { useState, useEffect } from 'react'
import { ControladorDeConectividad } from './componentes/controladores/ControladorDeConectividad'
import { ControladorDeDescubrimiento } from './componentes/controladores/ControladorDeDescubrimiento'
import { ControladorDeArchivos } from './componentes/controladores/ControladorDeArchivos'
import { MonitorDeTransferencia } from './componentes/contenidos/MonitorDeTransferencia'

function App() {
  const [aliasPropio, setAliasPropio] = useState('...')
  const [archivos, setArchivos] = useState([])
  const [progreso, setProgreso] = useState(null)

  if (!window.apiExterna) {
    return (
      <div style={{ backgroundColor: '#2c3e50', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ color: '#e74c3c' }}>System Failure</h2>
        <p>El puente de comunicación seguro no pudo inicializarse.</p>
        <p style={{ fontSize: '0.8em', opacity: 0.7 }}>Verifica que preload.js no tenga errores de sintaxis.</p>
      </div>
    )
  }

  useEffect(() => {
    if (window.apiExterna) {
      window.apiExterna.obtenerAliasLocal().then(setAliasPropio)
      window.apiExterna.alRecibirProgreso((datos) => setProgreso(datos))
    }
  }, [])

  if (!window.apiExterna) return <div style={{padding: '20px', color: 'red'}}>Error: Puente de comunicación fallido.</div>

  return (
    <main className="aplicacion-principal">
      <header className="cabecera-principal" style={{padding: '20px', background: '#f5f5f5'}}>
        <h1>LocalSend | <span style={{color: '#00a693'}}>{aliasPropio}</span></h1>
        <ControladorDeConectividad />
      </header>
      <div className="layout-principal" style={{display: 'flex', gap: '20px', padding: '20px'}}>
        <section className="seccion-envio" style={{flex: 1}}>
          <ControladorDeArchivos alCambiarArchivos={setArchivos} />
          {progreso && <MonitorDeTransferencia {...progreso} />}
        </section>
        <aside className="seccion-descubrimiento" style={{width: '300px'}}>
          <ControladorDeDescubrimiento archivosParaEnviar={archivos} />
        </aside>
      </div>
    </main>
  )
}
export default App
