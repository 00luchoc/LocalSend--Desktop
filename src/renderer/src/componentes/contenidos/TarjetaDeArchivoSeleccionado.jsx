/**
 * Componente de contenido para mostrar los metadatos de un archivo.
 */
export function TarjetaDeArchivoSeleccionado({ nombre, tamaño, tipo, alEliminar }) {
  // Formateamos el tamaño para que sea legible (Nivel Medio de Abstracción)
  const formatearTamaño = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const tamaños = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + tamaños[i];
  };

  return (
    <article className="tarjeta-archivo animado">
      <div className="icono-tipo-archivo">📄</div>
      <div className="info-archivo">
        <strong className="nombre">{nombre}</strong>
        <div className="metadatos">
          <span>{formatearTamaño(tamaño)}</span>
          <span className="separador">•</span>
          <span>{tipo || 'Archivo'}</span>
        </div>
      </div>
      <button className="boton-eliminar" onClick={alEliminar} title="Quitar archivo">✕</button>
    </article>
  );
}
