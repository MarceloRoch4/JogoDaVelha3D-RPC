const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const {ipcMain} = require("electron");

const SERVER_PROTO_PATH = './servidor.proto';


const servidorPackageDefinition = protoLoader.loadSync(
  SERVER_PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

const serverProto = grpc.loadPackageDefinition(servidorPackageDefinition).serverStub;

export class RPCStub {
  constructor() {
    this.servidor = null;
    this.janela = null;
    this.porta = null;
  }

  desconectarDoServidor() {
    this.servidor.Desconectar({porta: this.porta}, (err) => {
      console.log(err)
    })
  }

  configurarStub(janela, porta) {
    this.janela = janela;
    this.porta = porta;
  }

  // Eventos gerados pela janela que serão enviados ao servidor RPC e distribuídos aos outros clientes
  escutarEventos() {
    ipcMain.on("mensagem", (event, args) => {
      this.servidor.EnviarMensagem(args, () => {
      })
    });

    ipcMain.on("desistir", (event, player) => {
      console.log("Jogador desistiu: ", player)
      this.servidor.Desistir({jogador: player}, () => {
      })
    });

    ipcMain.on("reiniciar", () => {
      this.servidor.Reiniciar(null, () => {
      })
    });

    ipcMain.on("entrar", () => {
      this.servidor.EntrarNoJogo({idUsuario: this.porta}, (err, response) => {
        this.janela.send("entrar", {player: response.player, salaCheia: response.salaCheia})
      })
    });

    ipcMain.on("conectar", () => {
      const servidor = new serverProto.Servidor('localhost:3000', grpc.credentials.createInsecure());
      this.servidor = servidor;

      servidor.Conectar({porta: this.porta}, (err) => {
        if (err) {
          console.log(err)
        } else {
          this.janela.send("conectar", this.porta)
        }
      })
    })

    ipcMain.on("atualizarEstado", (event, args) => {
      this.servidor.AtualizarEstado(args, () => {
      })
    })

    ipcMain.on("iniciar", () => this.servidor.Iniciar(null, () => {
    }));
  }
}

