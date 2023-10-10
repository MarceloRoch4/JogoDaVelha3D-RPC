const CLIENT_PROTO_PATH = 'cliente.proto';
const SERVER_PROTO_PATH = 'servidor.proto';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const clientPackageDefinition = protoLoader.loadSync(
  CLIENT_PROTO_PATH,
  {keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
  });

const servidorPackageDefinition = protoLoader.loadSync(
  SERVER_PROTO_PATH,
  {keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

const clientProto = grpc.loadPackageDefinition(clientPackageDefinition).clientStub;
const serverProto = grpc.loadPackageDefinition(servidorPackageDefinition).serverStub;

const mensagens = [];
let entrou = 0
const clientes = {}
const idsUsuarios = []

var server = new grpc.Server();

// Implementação do STUB do servidor
server.addService(serverProto.Servidor.service, {
  EnviarMensagem: enviarMensagem,
  Conectar: conectar,
  Desconectar: desconectar,
  EntrarNoJogo: entrarNoJogo,
  Iniciar: iniciar,
  AtualizarEstado: atualizarEstado,
  Desistir: desistir,
  Reiniciar: reiniciar,
});

server.bindAsync('localhost:3000', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Iniciando servidor RPC...');
    server.start();
});

function desistir(call) {
  const jogadorDesistente = call.request.jogador;
  Object.values(clientes).forEach(
    cliente => cliente.Desistir({jogador: jogadorDesistente} , () => {})
  )
}

function desconectar(call) {
  const porta = call.request.porta;
  console.log('Usuario desconectado', call.request);

  idsUsuarios.splice(idsUsuarios.indexOf(porta), 1);
  delete clientes[porta]

  if (idsUsuarios.length > 0) {
    Object.values(clientes).forEach(
      cliente => cliente.ClienteDesconectado(null, () => {})
    )
  }

  if (entrou > 0)
    entrou--

  console.log("clientes: ", clientes)
  console.log("usuarios: ", idsUsuarios)
}

function reiniciar() {
  let esperarDeNovo = false

  if (idsUsuarios.length === 1) {
    esperarDeNovo = true
  }

  Object.values(clientes).forEach(
    cliente => cliente.Reiniciar({idX: clientes[0], esperarDeNovo}, () => {})
  )
}

function enviarMensagem(call) {
    mensagens.push(call.request)
    broadcastMensagens()
}

function broadcastMensagens() {
  Object.values(clientes).forEach(
    cliente => cliente.RepassarMensagens({mensagens} , () => {})
  )
}

function entrarNoJogo(call, callback) {
  const idUsuario = call.request["idUsuario"]
  const salaCheia = idsUsuarios.length > 2

  if(!salaCheia) {
    // io.emit('atualizarPlayers', clients[0][id])
    Object.values(clientes).forEach(
      cliente => cliente.AtualizarPlayers({novoX: idsUsuarios[0]} , () => {})
    )
    entrou++
  }

  callback(null, {player: idsUsuarios[0] === idUsuario ? 'X' : 'O', salaCheia});
}

function iniciar() {
  if (entrou === 2 && idsUsuarios.length === 2) {
    Object.values(clientes).forEach(
      cliente => cliente.LimparModais(null, () => {})
    )
  }
}

function atualizarEstado(call) {
  Object.values(clientes).forEach(
    cliente => cliente.AtualizarEstado(call.request, () => {})
  )
}

function conectar(call, callback) {
  const porta = call.request["porta"]
    console.log('Novo cliente conectando na porta ',porta)
    const cliente = new clientProto.Cliente(`localhost:${porta}`, grpc.credentials.createInsecure())
    idsUsuarios.push(porta)
    clientes[porta] = cliente
    callback()
}
