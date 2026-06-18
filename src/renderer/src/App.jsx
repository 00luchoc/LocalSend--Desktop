import { useState, useEffect } from 'react'
import './App.css'
import { LogoLocalSend } from './componentes/contenidos/Iconos'
import { ControladorDeConectividad } from './componentes/controladores/ControladorDeConectividad'
import { ControladorDeDescubrimiento } from './componentes/controladores/ControladorDeDescubrimiento'
import { ControladorDeArchivos } from './componentes/controladores/ControladorDeArchivos'
import { NotificacionDeResultado } from './componentes/contenidos/NotificacionDeResultado'
import { MonitorDeTransferencia } from './componentes/contenidos/MonitorDeTransferencia'

/**
 * Componente Principal: Orquesta el estado global y la navegación.
 * Aplica el principio de Responsabilidad Única (SRP).
 */
function App() {
  const [alias, setAlias] = useState('...')
  const [archivos, setArchivos] = useState([])
  const [progreso, setProgreso] = useState(null)
  const [solicitud, setSolicitud] = useState(null)
  const [notificacion, setNotificacion] = useState({ visible: false, nombre: '', esRecepcion: false })

  useEffect(() => {
    if (window.apiExterna) {
      // 1. Carga de identidad inicial
      window.apiExterna.obtenerAliasLocal().then(setAlias)
      
      // 2. Escucha de solicitudes de entrada (Receptor)
      window.apiExterna.alRecibirSolicitud(setSolicitud)

      // 3. Gestión de progreso y finalización
      window.apiExterna.alRecibirProgreso((datos) => {
        setProgreso(datos)
        
        if (parseFloat(datos.porcentaje) >= 100) {
          // Al completar: mostramos la notificación emergente
          setNotificacion({ 
            visible: true, 
            nombre: datos.nombre, 
            esRecepcion: datos.esRecepcion 
          })

          // Limpiamos la lista si es un envío y el monitor técnico
          if (!datos.esRecepcion) {
            setArchivos(prev => prev.filter(a => a.name !== datos.nombre))
          }
          setProgreso(null)
        }
      })
    }
  }, [])

  return (
    <main className="aplicacion-principal">
      {/* NOTIFICACIÓN EMERGENTE (Arriba y Cerrable) */}
      <NotificacionDeResultado 
        esVisible={notificacion.visible} 
        nombreArchivo={notificacion.nombre} 
        esRecepcion={notificacion.esRecepcion}
        alCerrar={() => setNotificacion({ ...notificacion, visible: false })} 
      />

      {/* MODAL DE SOLICITUD (Solo cuando alguien envía algo) */}
      {solicitud && (
        <div className="overlay-bloqueante">
          <div className="modal-solicitud-entrada animado-pop">
            <h3>Solicitud de Entrada</h3>
            <p>¿Deseas recibir <strong>{solicitud.nombre}</strong>?</p>
            <div className="acciones-modal">
              <button className="boton-primario" onClick={() => { window.apiExterna.responderSolicitud({aceptada: true}); setSolicitud(null) }}>Aceptar</button>
              <button className="boton-secundario" onClick={() => { window.apiExterna.responderSolicitud({aceptada: false}); setSolicitud(null) }}>Rechazar</button>
            </div>
          </div>
        </div>
      )}

      <header className="cabecera-app">
        <div className="identidad">
          <LogoLocalSend />
          <div>
            <h1>LocalSend</h1>
            <p className="badge-alias">Dispositivo: <strong>{alias}</strong></p>
          </div>
        </div>
        <ControladorDeConectividad />
      </header>

      <div className="layout-principal">
        <section className="area-envio">
          <ControladorDeArchivos archivos={archivos} alCambiarArchivos={setArchivos} />
          {progreso && <MonitorDeTransferencia {...progreso} />}
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
