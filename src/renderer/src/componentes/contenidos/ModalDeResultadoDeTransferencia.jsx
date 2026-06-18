export function ModalDeResultadoDeTransferencia({ esVisible, nombreArchivo, esRecepcion, alCerrar }) {
  if (!esVisible) return null;
  return (
    <div className="modal-resultado">
      <button onClick={alCerrar} style={{ float: 'right', border: 'none', background: 'none' }}>✕</button>
      <h2>{esRecepcion ? '¡Recepción Exitosa!' : '¡Envío Exitoso!'}</h2>
      <p>El archivo <strong>{nombreArchivo}</strong> {esRecepcion ? 'se guardó en Descargas.' : 'se envió correctamente.'}</p>
    </div>
  );
}
