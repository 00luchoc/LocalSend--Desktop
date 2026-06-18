import { TarjetaDeDispositivo } from '../contenidos/TarjetaDeDispositivo'

export function ContenedorDeListaDeDispositivos({ listaDeDispositivos, alSeleccionar }) {
  if (listaDeDispositivos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#b2bec3' }}>
        <p>Buscando dispositivos en la red local...</p>
      </div>
    )
  }

  return (
    <section className="lista-dispositivos">
      {listaDeDispositivos.map((dispositivo) => (
        <TarjetaDeDispositivo
          key={dispositivo.direccionIp}
          alias={dispositivo.alias}
          direccionIp={dispositivo.direccionIp}
          tipo={dispositivo.tipo}
          alHacerClick={alSeleccionar}
        />
      ))}
    </section>
  )
}
