export function IndicadorDeEstadoDeRed({ esActivo }) {
  const claseLed = `led-estado ${esActivo ? 'led-activo' : 'led-inactivo'}`

  return (
    <div className="indicador-contenedor">
      <span className={claseLed} />
      <small>{esActivo ? 'Disponible' : 'Desconectado'}</small>
    </div>
  )
}
