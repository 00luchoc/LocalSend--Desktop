import { useState, useEffect } from 'react'
import './App.css'
import { ControladorDeConectividad } from './componentes/controladores/ControladorDeConectividad'
import { ControladorDeDescubrimiento } from './componentes/controladores/ControladorDeDescubrimiento'
import { ControladorDeArchivos } from './componentes/controladores/ControladorDeArchivos'
import { ModalDeResultadoDeTransferencia } from './componentes/contenidos/ModalDeResultadoDeTransferencia'
import { MonitorDeTransferencia } from './componentes/contenidos/MonitorDeTransferencia'

function App() {
  const [aliasPropio, setAliasPropio] = useState('...')
  const [archivosGlobales, setArchivosGlobales] = useState([])
  const [progreso, setProgreso] = useState(null)
  const [solicitudEntrada, setSolicitudEntrada] = useState(null)
  const [mensajeNegociacion, setMensajeNegociacion] = useState('')
  const [exito, setExito] = useState({ visible: false, nombre: '', esRecepcion: false })

  useEffect(() => {
    window.apiExterna.obtenerAliasLocal().then(setAliasPropio);

    // ESCUCHA DE SOLICITUDES (RECEPTOR)
    window.apiExterna.alRecibirSolicitud((datos) => {
      setSolicitudEntrada(datos);
    });

    // ESCUCHA DE ESTADO (EMISOR)
    window.apiExterna.alCambiarEstadoNegociacion(({ nombre, estado }) => {
      const msjs = { 
        'esperando': `Esperando aprobación para ${nombre}...`, 
        'aceptada': '¡Transferencia aceptada! Iniciando envío...', 
        'negada': 'Transferencia rechazada por el otro dispositivo.' 
      };
      setMensajeNegociacion(msjs[estado]);
      if (estado !== 'esperando') setTimeout(() => setMensajeNegociacion(''), 4000);
    });

    // ESCUCHA DE PROGRESO (AMBOS ROLES)
    window.apiExterna.alRecibirProgreso((datos) => {
      setProgreso(datos); // Esto hace que el monitor aparezca

      // Lógica de finalización
      if (parseFloat(datos.porcentaje) >= 100) {
        // Si somos emisores, quitamos de la lista
        if (!datos.esRecepcion) {
          setArchivosGlobales(prev => prev.filter(a => a.name !== datos.nombre));
        }
        
        // Mostramos el modal con el texto correcto
        setExito({ 
          visible: true, 
          nombre: datos.nombre, 
          esRecepcion: datos.esRecepcion 
        });

        // Limpiamos el monitor después de un momento
        setTimeout(() => setProgreso(null), 3000);
      }
    });
  }, []);

  const responder = (aceptada) => {
    window.apiExterna.responderSolicitud({ aceptada });
    setSolicitudEntrada(null);
  };

  return (
    <main className="aplicacion-principal">
      {/* Modal de Éxito Dinámico */}
      <ModalDeResultadoDeTransferencia 
        esVisible={exito.visible} 
        nombreArchivo={exito.nombre} 
        esRecepcion={exito.esRecepcion}
        alCerrar={() => setExito({ ...exito, visible: false })} 
      />

      {/* Modal de Aceptación para el Receptor */}
      {solicitudEntrada && (
        <div className="modal-solicitud-entrada">
          <div className="icono-alerta">📥</div>
          <h3>Solicitud de Entrada</h3>
          <p>¿Deseas recibir <strong>{solicitudEntrada.nombre}</strong>?</p>
          <div className="acciones">
            <button onClick={() => responder(true)} className="boton-aceptar">Aceptar</button>
            <button onClick={() => responder(false)} className="boton-negar">Rechazar</button>
          </div>
        </div>
      )}

      {/* Toast de estado para el Emisor */}
      {mensajeNegociacion && <div className="toast-negociacion">{mensajeNegociacion}</div>}

      <header className="cabecera-app">
        <div className="identidad">
          <h1>LocalSend</h1>
          <div className="badge-alias">Alias: <span>{aliasPropio}</span></div>
        </div>
        <ControladorDeConectividad />
      </header>
      
      <div className="layout-principal">
        <section className="area-envio">
          <ControladorDeArchivos archivos={archivosGlobales} alCambiarArchivos={setArchivosGlobales} />
          
          {/* MONITOR: Se muestra si hay datos de progreso */}
          {progreso && (
            <div className="contenedor-monitor">
              <MonitorDeTransferencia {...progreso} />
            </div>
          )}
        </section>

        <aside className="panel-dispositivos">
          <h3>Dispositivos Cercanos</h3>
          <ControladorDeDescubrimiento archivosParaEnviar={archivosGlobales} />
        </aside>
      </div>
    </main>
  )
}
export default App;
