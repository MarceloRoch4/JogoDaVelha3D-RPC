import { app, shell, BrowserWindow} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png'

import { RPCStub } from "./rpc";
import tcpPortUsed from "tcp-port-used";

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const CLIENT_PROTO_PATH = './cliente.proto';

const clientPackageDefinition = protoLoader.loadSync(
  CLIENT_PROTO_PATH,
  {keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

const clientProto = grpc.loadPackageDefinition(clientPackageDefinition).clientStub;
const cliente = new grpc.Server();

// Implementação do STUB do cliente
cliente.addService(clientProto.Cliente.service, {
  RepassarMensagens: repassarMensagens,
  AtualizarPlayers: atualizarPlayers,
  ClienteDesconectado: clienteDesconectado,
  LimparModais: limparModais,
  AtualizarEstado: atualizarEstado,
  Desistir: desistir,
  Reiniciar: reiniciar,
});

// Porta que Client Stub vai rodar
let porta = 3001
let mainWindow;
const rpcStub = new RPCStub()

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  tcpPortUsed.check(porta, 'localhost')
    .then(function(inUse) {
      console.log("porta 3001 em uso: ", inUse)
      if (inUse) {
        porta = 3002;
      }

      cliente.bindAsync(`localhost:${porta}`, grpc.ServerCredentials.createInsecure(), () => {
        console.log(`Iniciando cliente RPC na porta ${porta}...`);
        cliente.start();

        rpcStub.configurarStub(mainWindow, porta);
        rpcStub.escutarEventos();
      });
    }, function(err) {
      console.error('Erro ao verificar porta:', err.message);
    });


  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

    // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    rpcStub.desconectarDoServidor()
    app.quit()
  }
})

// Chamadas recebidas do servidor e repassadas para a janela
function repassarMensagens(call) { // Recebe mensagens do servidor
    mainWindow.send("mensagem", call.request["mensagens"]);
}

function atualizarPlayers(call) {
  mainWindow.send("atualizarPlayers", call.request["novoX"]);
}

function limparModais() {
  mainWindow.send("limparModais");
}

function atualizarEstado(call) {
  mainWindow.send("atualizarEstado", call.request)
}

function desistir(call) {
  mainWindow.send("desistir", call.request["jogador"]);
}

function reiniciar(call) {
  mainWindow.send("reiniciar", call.request);
}

function clienteDesconectado() {
  mainWindow.send("clienteDesconectado");
}
