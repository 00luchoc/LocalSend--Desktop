import { useState, useEffect } from 'react'
import { ControladorDeConectividad } from './componentes/controladores/ControladorDeConectividad'
import { ControladorDeDescubrimiento } from './componentes/controladores/ControladorDeDescubrimiento'
import { ControladorDeArchivos } from './componentes/controladores/ControladorDeArchivos'

function App() {
  const [aliasPropio, setAliasPropio] = useState('Cargando...')
  const [archivosSeleccionados, setArchivosSeleccionados] = useState([])

  useEffect(() => {
    // Obtenemos nuestra identidad única al arrancar
    window.apiExterna.obtenerAliasLocal().then(setAliasPropio)
    
    window.apiExterna.alActualizarAlias((nuevoAlias) => {
      setAliasPropio(nuevoAlias)
    })
  }, [])

  if (!window.apiExterna) return <div>Error de Puente Seguro</div>

  return (
    <main className="aplicacion-principal">
      <header className="cabecera-principal" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
        <div>
          <h1>LocalSend</h1>
          <p>Tu alias: <strong>{aliasPropio}</strong></p>
        </div>
        <ControladorDeConectividad />
      </header>
      
      <div className="layout-principal">
        <section className="seccion-envio">
          <ControladorDeArchivos alCambiarArchivos={setArchivosSeleccionados} />
        </section>

        <aside className="seccion-descubrimiento">
          <ControladorDeDescubrimiento archivosParaEnviar={archivosSeleccionados} />
        </aside>
      </div>
    </main>
  )
}

export default App
