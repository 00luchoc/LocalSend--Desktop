import { IconoCheck } from './Iconos' // <--- Verifica que tenga las llaves { }

export function NotificacionDeResultado({ esVisible, nombreArchivo, esRecepcion, alCerrar }) {
  if (!esVisible) return null;

  return (
    <div className="notificacion-emergente animado-slide-down">
      <div className="notificacion-icono">
        <IconoCheck /> 
      </div>
      <div className="notificacion-texto">
        <strong>{esRecepcion ? 'Recepción Exitosa' : 'Envío Exitoso'}</strong>
        <p>{nombreArchivo}</p>
      </div>
      <button className="boton-cerrar-notificacion" onClick={alCerrar}>✕</button>
    </div>
  );
}
