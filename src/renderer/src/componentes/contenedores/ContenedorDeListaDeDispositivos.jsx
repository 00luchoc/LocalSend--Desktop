import { TarjetaParaDispositivo } from '../contenidos/TarjetaParaDispositivo'

export function ContenedorDeListaDeDispositivos({ listaDeDispositivos }) {
  return (  
    <section className="lista-dispositivos">
      <h3>Dispositivos Cercanos</h3>
      {listaDeDispositivos.length === 0 ? (
        <p>Buscando dispositivos en la red...</p>
      ) : (
        listaDeDispositivos.map((disp) => (
          <TarjetaParaDispositivo
            key={disp.direccionIp}
            alias={disp.alias}
            direccionIp={disp.direccionIp}
            tipo={disp.tipo}
          />
        ))
      )}
    </section>
  )
}
