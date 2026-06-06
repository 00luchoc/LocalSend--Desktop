export function TarjetaDeArchivoSeleccionado({ nombre, peso, tipo }) {
  return (
    <li className="item-archivo">
      <strong>{nombre}</strong>
      <div className="detalle-archivo">
        <span>Peso: {peso}</span> | <span>Tipo: {tipo}</span>
      </div>
    </li>
  )
}
