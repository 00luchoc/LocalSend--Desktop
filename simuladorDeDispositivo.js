const dgram = require('dgram')

// Configuraciones basadas en los requisitos técnicos
const PUERTO_DESTINO = 53317
const clienteUdp = dgram.createSocket('udp4')

const dispositivoSimulado = {
  alias: 'Celular de Prueba',
  tipo: 'Smartphone',
  puerto: 53317
}

const mensajeDePrueba = Buffer.from(JSON.stringify(dispositivoSimulado))

function simularEnvioDeLatido() {
  // Enviamos a localhost para probar en la misma máquina
  clienteUdp.send(mensajeDePrueba, PUERTO_DESTINO, '127.0.0.1', (error) => {
    if (error) {
      console.error('Error al simular latido:', error)
    } else {
      console.log('✔ Latido de simulación enviado a la app')
    }
  })
}

// Simular un latido cada 3 segundos
setInterval(simularEnvioDeLatido, 3000)

console.log('🚀 Simulador activo. Tu app debería detectar al "Celular de Prueba" ahora.')
