import { TarjetaDeArchivoSeleccionado } from '../contenidos/TarjetaDeArchivoSeleccionado'

export function ListaDeArchivosSeleccionados({ archivos }) {
  const formatearPesoDelArchivo = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const constanteDeConversion = 1024
    const unidades = ['Bytes', 'KB', 'MB', 'GB']
    const indiceUnidad = Math.floor(Math.log(bytes) / Math.log(constanteDeConversion))
    const pesoCalculado = parseFloat((bytes / Math.pow(constanteDeConversion, indiceUnidad)).toFixed(2))
    return `${pesoCalculado} ${unidades[indiceUnidad]}`
  }

  return (
    <div className="contenedor-lista-archivos">
      <h4>Archivos preparados ({archivos.length})</h4>
      <ul className="lista-archivos">
        {archivos.map((archivo, indice) => (
        <TarjetaDeArchivoSeleccionado
          key={`${archivo.name}-${indice}`} // El índice garantiza que duplicados tengan keys distintas
          nombre={archivo.name}
          peso={formatearPesoDelArchivo(archivo.size)}
          tipo={archivo.type || 'Documento'}
        />
      ))}
      </ul>
    </div>
  )
}
