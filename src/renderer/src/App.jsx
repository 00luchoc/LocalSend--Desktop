import { useState, useEffect } from 'react'
import { ControladorDeConectividad } from './componentes/controladores/ControladorDeConectividad'
import { ControladorDeDescubrimiento } from './componentes/controladores/ControladorDeDescubrimiento'
import { ControladorDeArchivos } from './componentes/controladores/ControladorDeArchivos'

function App() {
  const [archivos, setArchivos] = useState([])

  if (!window.apiExterna) {
    return <div style={{ padding: '20px', color: 'red' }}>Error crítico: Puente de comunicación no disponible.</div>
  }

  return (
    <main className="aplicacion-principal">
      <header className="cabecera-principal">
        <h1>LocalSend</h1>
        <ControladorDeConectividad />
      </header>
      <div className="layout-principal">
        <section className="seccion-envio">
          <ControladorDeArchivos alCambiarArchivos={setArchivos} />
        </section>
        <aside className="seccion-descubrimiento">
          <ControladorDeDescubrimiento archivosParaEnviar={archivos} />
        </aside>
      </div>
    </main>
  )
}

export default App
