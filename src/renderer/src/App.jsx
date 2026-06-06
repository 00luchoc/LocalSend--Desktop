import { ControladorDeConectividad } from './componentes/controladores/ControladorDeConectividad'
import { ControladorDeDescubrimiento } from './componentes/controladores/ControladorDeDescubrimiento'
import { ControladorDeArchivos } from './componentes/controladores/ControladorDeArchivos'

function App() {
  return (
    <main className="aplicacion-principal">
      <header className="cabecera-principal">
        <h1 style={{ color: '#2c3e50', margin: 0 }}>LocalSend</h1>
        <ControladorDeConectividad />
      </header>
      <div className="layout-principal">
        {/* Lógica de archivos (Izquierda) */}
        <section className="seccion-envio">
          <ControladorDeArchivos />
        </section>

        {/* Descubrimiento (Derecha) */}
        <aside className="seccion-descubrimiento">
          <ControladorDeDescubrimiento />
        </aside>
      </div>
    </main>
  )
}

export default App