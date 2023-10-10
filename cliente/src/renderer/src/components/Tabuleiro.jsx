import * as React from "react";
import './Tabuleiro.css'
import {checarVitoria} from "../utils";
import Modal from "./Modal";

export default function Tabuleiro() {
  const [player, setPlayer] = React.useState(null);
  const [quemJoga, setQuemJoga] = React.useState('X');
  const [desistencia, setDesistencia] = React.useState(null);
  const [vencedor, setVencedor] = React.useState(null);
  const [modalAberto, setModalAberto] = React.useState(true)
  const [modalSelecionado, setModalSelecionado] = React.useState("erroSocket")

  const [estado, setEstado] = React.useState(estadoInicial());
  const [mensagens, setMensagens] = React.useState([])
  const [mensagemAtual, setMensagemAtual] = React.useState('')
  const [nome, setNome] = React.useState('')
  const [jogoIniciou, setJogoIniciou] = React.useState(false)
  const [idUsuario, setIdUsuario] = React.useState()

  let idMensagem = 0

  const inverso = {
    'X': 'O',
    'O': 'X'
  }

  React.useEffect(() => {
    window.api.receive("atualizarPlayers", (data) => {
      if (idUsuario === data)
        setPlayer('X')
      else
        setPlayer('O')
    });

    window.api.receive("reiniciar", (data) => {
      if (data.idX === idUsuario) {
        setPlayer('X')
      }

      novoJogo()

      if (data.esperarDeNovo) {
        abrirModal('espera')
      }
    });
  }, [idUsuario])

  React.useEffect(() => {
    window.api.receive("clienteDesconectado", () => {
      if (jogoIniciou) { // se jogo tiver iniciado
        desistir(inverso[player])
      }
    });
  }, [player, jogoIniciou])

  React.useEffect(() => {
    window.api.receive("atualizarEstado", (data) => {
      setEstado(data.estado);
      setQuemJoga(data.proximoJogador)
    });

    window.api.receive("conectar", (portaCliente) => {
      setIdUsuario(portaCliente)
      abrirModal('inicio')
    });

    window.api.receive("desistir", (player) => {
      desistir(player)
    });

    window.api.receive("mensagem", (mensagens) => {
      console.log(mensagens)
      setMensagens(mensagens)
    });

    window.api.receive("limparModais", () => {
      setModalAberto(false)
      setJogoIniciou(true)
    });

    window.api.receive("entrar", (response) => {
      if (response.salaCheia) {
        setModalSelecionado('salaCheia')
        window.api.send("desconectar", {});
        return
      }

      setPlayer(response.player)
      window.api.send("iniciar")
    });

    window.api.send("conectar", {});
  }, [])

  React.useEffect(() => {
    setVencedor(checarVitoria(estado));
  })

  function abrirModal(nomeModal) {
    setModalAberto(true)
    setModalSelecionado(nomeModal)
  }

  const modais = {
    inicio: <Modal modal="inicio" acao={salvarNome}/>,
    reiniciar: <Modal
      fecharModal={() => setModalAberto(false)}
      modal="reiniciar"
      acao={() => window.api.send('reiniciar')}
    />,
    desistencia: <Modal
      fecharModal={() => setModalAberto(false)}
      modal="desistencia"
      acao={() => window.api.send('desistir', player)}
    />,
    espera: <Modal
      fecharModal={() => setModalAberto(false)}
      modal="espera"
    />,
    salaCheia: <Modal
      fecharModal={() => setModalAberto(false)}
      modal="salaCheia"
    />,
    erroSocket: <Modal
      fecharModal={() => setModalAberto(false)}
      modal="erroSocket"
    />,
  }

  function salvarNome(nome) {
    setNome(nome)
    setModalSelecionado('espera')
    window.api.send('entrar')
  }

  function estadoInicial() {
    return Array(27).fill('')
  }

  function novoJogo() {
    setEstado(estadoInicial())
    setDesistencia(null)
    setQuemJoga('X')
    setVencedor(null)
    setModalAberto(false)
  }

  function desistir(playerQueDesistiu) {
    setEstado(estadoInicial())
    setDesistencia(playerQueDesistiu)
    setVencedor(inverso[playerQueDesistiu])
    setModalAberto(false)
  }

  function enviarMensagem(e) {
    e.preventDefault()

    if (mensagemAtual.length > 0) {
      window.api.send('mensagem', {nome, conteudo: mensagemAtual})
    }

    setMensagemAtual('')
  }

  function realizarJogada(indice) {
    console.log(player)
    console.log('quemjoga ', quemJoga)
    if (estado[indice] || checarVitoria(estado) || player !== quemJoga || desistencia) {
      return;
    }

    console.log('nova jogada client', indice)

    const estadoCopia = estado.slice();

    estadoCopia[indice] = player;
    window.api.send('atualizarEstado', {estado: estadoCopia, proximoJogador: inverso[player]})
  }

  function Campo({value, indice}) {
    return (
      <td className="square" onClick={() => realizarJogada(indice)}>

        {value || <span style={{color: "#AAA"}}>{indice}</span>}
      </td>
    );
  }

  return (
    <div className='container'>
      <div className="jogo">
        <h2>Nome do jogador: {nome} | Simbolo: {player}</h2>

        <div id="tabuleiro">
          <table>
            <tbody>
            <tr>
              <Campo value={estado[0]} id="0" indice={0}/>
              <Campo value={estado[1]} id="1" indice={1}/>
              <Campo value={estado[2]} id="2" indice={2}/>
            </tr>
            <tr>
              <Campo value={estado[3]} id="3" indice={3}/>
              <Campo value={estado[4]} id="4" indice={4}/>
              <Campo value={estado[5]} id="5" indice={5}/>
            </tr>
            <tr>
              <Campo value={estado[6]} id="6" indice={6}/>
              <Campo value={estado[7]} id="7" indice={7}/>
              <Campo value={estado[8]} id="8" indice={8}/>
            </tr>
            </tbody>
          </table>
          <table>
            <tbody>
            <tr>
              <Campo value={estado[9]} id="9" indice={9}/>
              <Campo value={estado[10]} id="10" indice={10}/>
              <Campo value={estado[11]} id="11" indice={11}/>
            </tr>
            <tr>
              <Campo value={estado[12]} id="12" indice={12}/>
              <Campo value={estado[13]} id="13" indice={13}/>
              <Campo value={estado[14]} id="14" indice={14}/>
            </tr>
            <tr>
              <Campo value={estado[15]} id="15" indice={15}/>
              <Campo value={estado[16]} id="16" indice={16}/>
              <Campo value={estado[17]} id="17" indice={17}/>
            </tr>
            </tbody>
          </table>
          <table>
            <tbody>
            <tr>
              <Campo value={estado[18]} id="18" indice={18}/>
              <Campo value={estado[19]} id="19" indice={19}/>
              <Campo value={estado[20]} id="20" indice={20}/>
            </tr>
            <tr>
              <Campo value={estado[21]} id="21" indice={21}/>
              <Campo value={estado[22]} id="22" indice={22}/>
              <Campo value={estado[23]} id="23" indice={23}/>
            </tr>
            <tr>
              <Campo value={estado[24]} id="24" indice={24}/>
              <Campo value={estado[25]} id="25" indice={25}/>
              <Campo value={estado[26]} id="26" indice={26}/>
            </tr>
            </tbody>
          </table>
        </div>

        <div className="mensagem">
          {vencedor ?
            <h1 style={{color: 'green'}}>{`${vencedor} é o vencedor!`}</h1> : <h2>{`Vez do jogador: ${quemJoga}`}</h2>
          }
        </div>

        <div className="mensagem">
          <h3
            style={{color: 'green'}}>{desistencia && `"${desistencia}" desistiu da partida, "${inverso[desistencia]}" venceu!`}</h3>
        </div>

        <div className="acoes">
          <button onClick={() => abrirModal("reiniciar")}>
            Reiniciar partida
          </button>

          <button disabled={Boolean(vencedor) || Boolean(desistencia)} onClick={() => abrirModal("desistencia")}>
            Desistir
          </button>
        </div>
      </div>

      <div className="chat">
        <div className="chat-text">
          <ul>
            {
              mensagens.map((data) =>
                <li key={idMensagem++}>{data['nome']}: {data['conteudo']}</li>
              )
            }
          </ul>
        </div>

        <form onSubmit={enviarMensagem}>
          <input
            type="text"
            value={mensagemAtual}
            onChange={(event) => setMensagemAtual(event.target.value)}
          />
          <button type='submit'>Enviar</button>
        </form>

      </div>

      {modalAberto && modais[modalSelecionado]}

    </div>
  )
}
