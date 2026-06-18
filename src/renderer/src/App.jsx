import { useState, useEffect } from 'react'
import './App.css'
import { LogoLocalSend } from './componentes/contenidos/Iconos'
import { ControladorDeConectividad } from './componentes/controladores/ControladorDeConectividad'
import { ControladorDeArchivos } from './componentes/controladores/ControladorDeArchivos'
import { ControladorDeDescubrimiento } from './componentes/controladores/ControladorDeDescubrimiento'

function App() {
  const [alias, setAlias] = useState('...')
  const [archivos, setArchivos] = useState([])

  useEffect(() => {
    if (window.apiExterna) {
      window.apiExterna.obtenerAliasLocal().then(setAlias)
    }
  }, [])

  return (
    <main className="aplicacion-principal">
      <header className="cabecera-app">
        <div className="identidad">
          <LogoLocalSend />
          <div>
            <h1>LocalSend</h1>
            <p className="badge-alias">Alias: <strong>{alias}</strong></p>
          </div>
        </div>
        <ControladorDeConectividad />
      </header>
      
      <div className="layout-principal">
        <section className="area-envio">
          <ControladorDeArchivos archivos={archivos} alCambiarArchivos={setArchivos} />
        </section>

        <aside className="panel-dispositivos">
          <h3>Dispositivos Cercanos</h3>
          <ControladorDeDescubrimiento archivosParaEnviar={archivos} />
        </aside>
      </div>
    </main>
  )
}

export default App
