import React from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  FileText,
  Flag,
  HelpCircle,
  Keyboard,
  MapPin,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import {
  DESCRICOES,
  ESCALA,
  FUNDAMENTOS,
  QUALIDADE_PARA_TECLA,
  classificar,
  nomeQualidade,
} from '../../Model/Qualidade';

// Os fundamentos sao normalizados sem acento no Model; aqui eles aparecem para
// o usuario, entao voltam acentuados.
const ROTULO_FUNDAMENTO = { Recepcao: 'Recepção' };

/**
 * Manual do analista.
 *
 * Cobre o fluxo inteiro da tela de scout, nao so os atalhos: o que preparar
 * antes de comecar, como o placar e a rotacao funcionam, o que cada correcao
 * conserta e o que sai nos relatorios. E o unico lugar do sistema em que o
 * simbolo cru da escala de qualidade aparece, porque aqui ele ensina a
 * digitacao.
 */

const SECOES = [
  { id: 'antes', rotulo: 'Antes de escoutar' },
  { id: 'fluxo', rotulo: 'Fluxo do scout' },
  { id: 'acoes', rotulo: 'Teclas de ação' },
  { id: 'qualidade', rotulo: 'Qualidade da ação' },
  { id: 'placar', rotulo: 'Atalhos do placar' },
  { id: 'dono', rotulo: 'A quem o ponto pertence' },
  { id: 'rotacao', rotulo: 'Rotação (5-1)' },
  { id: 'escalacao', rotulo: 'Escalação e substituições' },
  { id: 'adversario', rotulo: 'Scout do adversário' },
  { id: 'sets', rotulo: 'Sets e fim de partida' },
  { id: 'correcoes', rotulo: 'Corrigindo erros' },
  { id: 'relatorios', rotulo: 'O que sai nos relatórios' },
  { id: 'observacoes', rotulo: 'Observações' },
];

const Secao = ({ id, titulo, icone, cor = 'gray', children }) => {
  const paleta = {
    gray: 'border-gray-100 bg-gray-50',
    red: 'border-red-200 bg-red-50',
    orange: 'border-orange-200 bg-orange-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    blue: 'border-blue-200 bg-blue-50',
    amber: 'border-amber-200 bg-amber-50',
    violet: 'border-violet-200 bg-violet-50',
  };

  const tituloCor = {
    gray: 'text-gray-700',
    red: 'text-red-700',
    orange: 'text-orange-700',
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    amber: 'text-amber-800',
    violet: 'text-violet-700',
  };

  return (
    <section id={id} className={`scroll-mt-4 rounded-3xl border p-5 ${paleta[cor]}`}>
      <div className="mb-3 flex items-center gap-2">
        {icone}
        <h3 className={`text-sm font-black uppercase tracking-widest ${tituloCor[cor]}`}>
          {titulo}
        </h3>
      </div>
      {children}
    </section>
  );
};

/** Cartao branco usado dentro das secoes coloridas. */
const Cartao = ({ titulo, children, className = '' }) => (
  <div className={`rounded-2xl border border-white bg-white p-4 shadow-sm ${className}`}>
    {titulo && <p className="mb-1 font-black text-gray-900">{titulo}</p>}
    <div className="leading-6 text-gray-700">{children}</div>
  </div>
);

function HelpScoutModal({ open, onClose }) {
  if (!open) return null;

  const irPara = (id) => {
    const alvo = document.getElementById(id);
    if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10020] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-[2rem] bg-white border border-gray-100 shadow-2xl p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <HelpCircle size={22} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                Ajuda
              </p>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Manual do Analista
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-3 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Indice: o manual ficou longo o bastante para valer navegacao. */}
        <div className="mb-6 flex flex-wrap gap-2">
          {SECOES.map((secao) => (
            <button
              key={secao.id}
              type="button"
              onClick={() => irPara(secao.id)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-colors hover:border-gray-900 hover:text-gray-900"
            >
              {secao.rotulo}
            </button>
          ))}
        </div>

        <div className="space-y-6 text-sm text-gray-700">
          {/* ------------------------------------------------ Antes de escoutar */}
          <Secao
            id="antes"
            titulo="Antes de escoutar"
            cor="blue"
            icone={<ClipboardList size={18} className="text-blue-600" />}
          >
            <p className="mb-3 leading-6 text-blue-900">
              Três passos, nesta ordem. Pular o segundo não impede o scout, mas a partida fica
              sem nenhum dado de rotação — e isso <strong>não dá para recuperar depois</strong>.
            </p>

            <div className="space-y-2">
              <Cartao titulo="1. Escalação">
                Botão <strong>Escalação</strong>. Escolha os <strong>6 em quadra</strong> e até{' '}
                <strong>8 no banco</strong> (máximo de 14). O líbero entra como reserva — ele não
                é um dos 6 titulares.
              </Cartao>

              <Cartao titulo="2. Formação do set">
                Botão <strong>Formação do set</strong>. Posicione os 6 que rodam nas zonas Z1 a Z6,
                marque o levantador com a <strong>estrela</strong> e diga quem <strong>saca
                primeiro</strong>. É isso que liga a rotação. Cada set tem a sua formação, e o set
                seguinte já abre com a do anterior preenchida.
              </Cartao>

              <Cartao titulo="3. Iniciar partida">
                Botão <strong>Iniciar Partida</strong>, que muda o status para <em>em andamento</em>.
                A partir daí é só digitar.
              </Cartao>
            </div>
          </Secao>

          {/* --------------------------------------------------- Fluxo do scout */}
          <Secao
            id="fluxo"
            titulo="Fluxo do scout"
            icone={<Keyboard size={18} className="text-gray-700" />}
          >
            <ol className="space-y-2 list-decimal pl-5 leading-6">
              <li>
                Segure <strong>Ctrl</strong> para a <strong>sua equipe</strong> ou{' '}
                <strong>Alt</strong> para o <strong>adversário</strong>.
              </li>
              <li>Digite o número da camisa do jogador.</li>
              <li>Solte o modificador.</li>
              <li>Pressione a tecla da ação: <strong>S</strong>, <strong>A</strong>, <strong>B</strong>, <strong>R</strong> ou <strong>D</strong>.</li>
              <li>Depois pressione a qualidade da ação: <strong>1</strong> a <strong>6</strong>, do erro ao ponto.</li>
              <li>Feche o rally no placar: <strong>Shift + ↑</strong> (ponto seu) ou <strong>Alt + ↑</strong> (ponto deles).</li>
            </ol>

            <div className="mt-4 rounded-2xl bg-white border border-gray-200 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                Exemplo
              </p>
              <p className="leading-6">
                Ponto de ataque do camisa 12:
                <br />
                <strong>Ctrl + 1 + 2</strong> → <strong>A</strong> (ataque) → <strong>6</strong>,
                que grava <strong>#</strong> → <strong>Shift + ↑</strong>.
              </p>
              <p className="leading-6 mt-3">
                O mesmo lance, mas do adversário camisa 12:{' '}
                <strong>Alt + 1 + 2</strong> → <strong>A</strong> → <strong>6</strong> →{' '}
                <strong>Alt + ↑</strong>.
              </p>
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              Um rally pode ter várias ações — recepção, defesa, ataque. Registre todas na ordem em
              que aconteceram; quem leva o ponto é a última.
            </p>
          </Secao>

          {/* --------------------------------------------------- Teclas de ação */}
          <Secao
            id="acoes"
            titulo="Teclas de ação"
            icone={<Keyboard size={18} className="text-gray-700" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>S</strong> = Saque</div>
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>A</strong> = Ataque</div>
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>B</strong> = Bloqueio</div>
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>R</strong> = Recepção</div>
              <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:col-span-2"><strong>D</strong> = Defesa</div>
            </div>
          </Secao>

          {/* ------------------------------------------------ Qualidade da ação */}
          <Secao
            id="qualidade"
            titulo="Qualidade da ação"
            icone={<Keyboard size={18} className="text-gray-700" />}
          >
            <p className="text-xs leading-5 text-gray-500 mb-3">
              A tecla é sempre de <strong>1</strong> a <strong>6</strong>, do erro ao ponto. O símbolo
              gravado é o mesmo em todos os fundamentos, mas o significado muda de um para o outro —
              é o padrão DataVolley. Durante o scout a legenda do fundamento aparece na tela.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-3 py-2 font-black uppercase tracking-widest">Fundamento</th>
                    {ESCALA.map((simbolo) => (
                      <th key={simbolo} className="px-3 py-2 text-center font-black">
                        <span className="block text-[10px] font-bold text-gray-400">
                          {QUALIDADE_PARA_TECLA[simbolo]}
                        </span>
                        {simbolo}
                        <span className="block text-[10px] font-bold normal-case text-gray-500">
                          {nomeQualidade(simbolo)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FUNDAMENTOS.map((fundamento) => (
                    <tr key={fundamento} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 font-black text-gray-900">
                        {ROTULO_FUNDAMENTO[fundamento] || fundamento}
                      </td>
                      {ESCALA.map((simbolo) => {
                        const resultado = classificar(fundamento, simbolo);
                        return (
                          <td
                            key={simbolo}
                            className={`px-3 py-2 leading-5 ${
                              resultado === 'PONTO'
                                ? 'text-emerald-700'
                                : resultado === 'ERRO'
                                  ? 'text-red-700'
                                  : 'text-gray-600'
                            }`}
                          >
                            {DESCRICOES[fundamento][simbolo]}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs leading-5 text-gray-500 mt-3">
              Em verde, a ação encerra o rally a favor da equipe; em vermelho, a favor do adversário.
              Repare no saque: <strong>/</strong> vale mais que <strong>+</strong>, porque significa
              que o adversário não conseguiu montar ataque nenhum.
            </p>
          </Secao>

          {/* -------------------------------------------------- Placar */}
          <Secao
            id="placar"
            titulo="Atalhos do placar"
            icone={<ArrowUp size={18} className="text-gray-700" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white border border-gray-200 p-4 flex items-center gap-3">
                <ArrowUp size={18} className="text-gray-700" />
                <div>
                  <strong>Shift + ↑</strong>
                  <p className="text-xs text-gray-500 mt-1">Ponto da sua equipe: fecha o rally a favor e soma no placar.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-4 flex items-center gap-3">
                <ArrowUp size={18} className="text-orange-500" />
                <div>
                  <strong>Alt + ↑</strong>
                  <p className="text-xs text-gray-500 mt-1">Ponto do adversário: marca o rally como ponto cedido.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-4 flex items-center gap-3">
                <ArrowDown size={18} className="text-gray-700" />
                <div>
                  <strong>Shift + ↓</strong>
                  <p className="text-xs text-gray-500 mt-1">Desfaz o último ponto da sua equipe.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-4 flex items-center gap-3">
                <ArrowDown size={18} className="text-orange-500" />
                <div>
                  <strong>Alt + ↓</strong>
                  <p className="text-xs text-gray-500 mt-1">Desfaz o último ponto do adversário.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-orange-200 p-4 flex items-center gap-3 sm:col-span-2">
                <Keyboard size={18} className="text-orange-500" />
                <div>
                  <strong>Alt + número</strong>
                  <p className="text-xs text-gray-500 mt-1">
                    Começa um lance do adversário pela camisa. <strong>Alt + 0</strong> = adversário
                    não identificado.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-4 flex items-center gap-3 sm:col-span-2">
                <Undo2 size={18} className="text-gray-700" />
                <div>
                  <strong>Ctrl + Z</strong>
                  <p className="text-xs text-gray-500 mt-1">
                    Desfaz o último lance digitado — a ação registrada ou o ponto somado no placar.
                    O painel lateral mostra o que será desfeito.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              Também dá para clicar direto no placar de cada lado. Os dois caminhos passam pela
              mesma regra, então a marcação de quem venceu o rally acontece igual.
            </p>
          </Secao>

          {/* ----------------------------------------------- Dono do ponto */}
          <Secao
            id="dono"
            titulo="A quem o ponto pertence"
            cor="emerald"
            icone={<Flag size={18} className="text-emerald-600" />}
          >
            <p className="leading-6">
              Cada ponto é creditado ao autor da <strong>última ação registrada no rally</strong>.
              Se a última ação foi um ataque do camisa 6, o ponto é do camisa 6.
            </p>

            <p className="leading-6 mt-3">
              Depois de registrar as ações, feche o rally no placar: <strong>Shift + ↑</strong> se
              a sua equipe venceu o ponto, <strong>Alt + ↑</strong> se o ponto foi do adversário.
              É isso que separa, no relatório, o <strong>ponto conquistado</strong> do{' '}
              <strong>ponto cedido</strong> — sem essa marcação um erro de ataque contaria como
              ponto a favor do atleta.
            </p>

            <div className="mt-4">
              <Cartao titulo="O dono do ponto é sempre da sua equipe" className="border-emerald-200">
                Apenas os atletas escalados da sua equipe recebem pontos. As ações do adversário
                (<strong>Alt + número</strong>) entram no resumo do adversário e <strong>não</strong>{' '}
                mudam de quem é o ponto no rally. O painel lateral mostra, em cada rally, de quem é
                o ponto — confira ali antes de seguir.
              </Cartao>
            </div>
          </Secao>

          {/* ------------------------------------------------------- Rotação */}
          <Secao
            id="rotacao"
            titulo="Rotação do levantador (5-1)"
            cor="red"
            icone={<MapPin size={18} className="text-red-600" />}
          >
            <p className="mb-3 leading-6">
              A rotação é a <strong>zona do levantador</strong>, de <strong>R1</strong> a{' '}
              <strong>R6</strong>. Declarada a formação, o indicador acima da quadra mostra a
              rotação, quem está levantando e quem está sacando — e a quadra gira sozinha.
            </p>

            <div className="mb-3 rounded-2xl border border-red-100 bg-white p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">
                As zonas
              </p>
              <pre className="text-[11px] leading-5 text-gray-700">{`         R E D E
   Z4   │   Z3   │   Z2     frente
  ──────┼────────┼──────
   Z5   │   Z6   │   Z1     fundo  (Z1 = quem saca)`}</pre>
            </div>

            <div className="space-y-2">
              <Cartao titulo="A rotação gira só no side-out" className="border-red-100">
                Ganhar o rally <strong>recebendo</strong> gira uma posição e passa o saque para a
                gente. Ganhar <strong>sacando</strong> é break point e não gira nada. Perder o rally
                nunca gira a nossa rotação.
              </Cartao>

              <Cartao titulo="O líbero não entra na formação" className="border-red-100">
                Ele não roda: entra no lugar de um jogador de fundo e sai antes de chegar à rede.
                Escale os 6 que rodam e registre a entrada dele pela substituição normal, que já é
                isenta do limite de 6 trocas do set. Se ele aparecer na rede, a tela avisa —
                quer dizer que a saída dele não foi registrada.
              </Cartao>

              <Cartao titulo="Dupla substituição" className="border-red-100">
                O botão <strong>Dupla sub</strong> faz as duas trocas de uma vez: o levantador sai
                para um oposto e o levantador reserva entra na diagonal, no lugar do oposto titular.
                O número da rotação <strong>não muda</strong> — ele acompanha o ciclo da equipe, não
                quem está levantando, senão as seis rotações virariam três. Clicar de novo desfaz,
                devolvendo cada atleta ao lugar de onde saiu.
              </Cartao>

              <Cartao titulo="Se a rotação sair do lugar" className="border-red-100">
                O botão <strong>girar</strong> (↻) ao lado do indicador gira a rotação inicial do
                set e recalcula o set inteiro. Como tudo é derivado do placar, essa é a única coisa
                que pode estar errada — não há contador para acertar na mão.
              </Cartao>

              <Cartao titulo="O que a rotação passa a responder" className="border-red-100">
                <strong>Side-out %</strong> e <strong>break %</strong> por rotação, e o saldo de
                cada uma: é assim que se descobre em qual rotação o set escorre. Mais o corte da
                dupla substituição — R2/R3/R4 com a troca contra sem a troca —, que diz em número
                se ela está valendo a pena.
              </Cartao>
            </div>
          </Secao>

          {/* ------------------------------------------- Escalação e substituições */}
          <Secao
            id="escalacao"
            titulo="Escalação e substituições"
            cor="violet"
            icone={<Users size={18} className="text-violet-600" />}
          >
            <div className="space-y-2">
              <Cartao titulo="Quem pode ser escoutado" className="border-violet-100">
                Só quem está <strong>em quadra</strong>. Digitar a camisa de um atleta que está no
                banco é recusado com aviso — se ele entrou, registre a substituição antes.
              </Cartao>

              <Cartao titulo="Regras da substituição" className="border-violet-100">
                <ul className="list-disc space-y-1 pl-5">
                  <li><strong>6 substituições por set</strong>, no máximo.</li>
                  <li>O reserva só pode sair para o <strong>mesmo titular</strong> que ele substituiu, e o titular só volta uma vez.</li>
                  <li>O <strong>líbero é isento</strong>: as trocas dele não consomem as 6.</li>
                  <li>A <strong>dupla substituição</strong> consome 2 das 6, como na regra real.</li>
                </ul>
              </Cartao>

              <Cartao titulo="Quem entra assume a zona de quem saiu" className="border-violet-100">
                A substituição troca o ocupante da zona, nunca a posição dela no ciclo. Por isso
                nenhuma troca — inclusive a do levantador — muda o número da rotação.
              </Cartao>
            </div>
          </Secao>

          {/* --------------------------------------------- Scout do adversário */}
          <Secao
            id="adversario"
            titulo="Scout do adversário"
            cor="orange"
            icone={<Keyboard size={18} className="text-orange-600" />}
          >
            <p className="leading-6 text-orange-900">
              Troque <strong>Ctrl</strong> por <strong>Alt</strong> no número da camisa e o lance
              inteiro passa a ser do outro lado da rede. É a mesma convenção do placar, onde{' '}
              <strong>Shift</strong> é a sua equipe e <strong>Alt</strong> é o adversário — não há um
              segundo mapa de teclas para decorar.
            </p>

            <p className="leading-6 mt-3 text-orange-900">
              Os atletas do adversário não são cadastrados: o registro é feito pela camisa lida na
              quadra. Quando não der para identificar quem jogou, use <strong>Alt + 0</strong> — a
              ação entra como <strong>adversário não identificado</strong> e continua contando nos
              totais por fundamento.
            </p>

            <div className="mt-4">
              <Cartao titulo="O que isso responde" className="border-orange-200">
                Quantos ataques, saques e bloqueios o adversário errou, e quantos ele converteu em
                ponto — por fundamento e por camisa. O painel lateral mostra o resumo do set aberto
                ou da partida inteira. A escala de qualidade é lida da perspectiva de quem executou:
                um ataque <strong>=</strong> do adversário é <strong>erro dele</strong>, ou seja,
                ponto seu.
              </Cartao>
            </div>

            <p className="leading-6 mt-3 text-orange-900">
              O adversário é escoutado só por camisa: não tem escalação, rotação nem dono de ponto.
              E fica em separado do scout da sua equipe — nenhum relatório de atleta, ranking ou
              estatística da equipe muda de número por causa dele.
            </p>
          </Secao>

          {/* --------------------------------------------- Sets e fim de partida */}
          <Secao
            id="sets"
            titulo="Sets e fim de partida"
            icone={<Flag size={18} className="text-gray-700" />}
          >
            <div className="space-y-2">
              <Cartao titulo="Quanto vale cada set">
                Set normal vai a <strong>25</strong>, e só o <strong>último set do formato</strong>{' '}
                vai a <strong>15</strong> — numa melhor de 5, o set 3 é um set comum de 25. Sempre
                com <strong>2 pontos de vantagem</strong>: em 25×24 o set continua. A tela mostra
                quantos pontos faltam e avisa no set point.
              </Cartao>

              <Cartao titulo="Encerrar o set">
                Com o set decidido, o botão <strong>Encerrar set</strong> fecha o placar e abre o
                próximo. Enquanto o set não é encerrado, ele não conta como set ganho. Encerrar
                antes da hora é permitido — set interrompido, W.O. —, mas a tela pede confirmação.
              </Cartao>

              <Cartao titulo="Set encerrado é somente leitura">
                Um set fechado <strong>recusa ponto e ação</strong>, porque o placar dele já virou
                resultado da partida. Para corrigir, use <strong>Reabrir set</strong>.
              </Cartao>

              <Cartao titulo="Sets ganhos são contados, não somados">
                O placar de sets vem dos sets encerrados. Por isso reabrir ou reencerrar um set
                nunca desencontra o resultado da partida.
              </Cartao>

              <Cartao titulo="Ao reabrir a partida">
                A tela cai no <strong>primeiro set em aberto</strong>, não no set 1 — assim não se
                escouta por cima de um set já fechado. Dá para navegar entre os sets pelos botões
                numerados; os encerrados aparecem com ✓.
              </Cartao>

              <Cartao titulo="Finalizar a partida">
                Quando um dos lados alcança os sets necessários, o painel oferece{' '}
                <strong>Finalizar partida</strong> com o placar de sets. O botão{' '}
                <strong>Finalizar Partida</strong> embaixo da quadra abre antes a tela de
                estatísticas, para conferir os números antes de gravar o resultado.
              </Cartao>
            </div>
          </Secao>

          {/* ------------------------------------------------- Corrigindo erros */}
          <Secao
            id="correcoes"
            titulo="Corrigindo erros"
            cor="amber"
            icone={<Undo2 size={18} className="text-amber-700" />}
          >
            <p className="mb-3 leading-6 text-amber-900">
              Cada tipo de erro tem o seu conserto. Nenhum deles exige refazer o set.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-amber-200 bg-white">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-3 py-2 font-black uppercase tracking-widest">Errou o quê</th>
                    <th className="px-3 py-2 font-black uppercase tracking-widest">Conserto</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Digitou a ação errada agora</td>
                    <td className="px-3 py-2"><strong>Ctrl + Z</strong>, ou o botão de desfazer no painel</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Começou a digitar errado, ainda sem gravar</td>
                    <td className="px-3 py-2"><strong>Esc</strong> limpa o buffer</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Somou ponto para o lado errado</td>
                    <td className="px-3 py-2"><strong>Shift + ↓</strong> ou <strong>Alt + ↓</strong></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">A rotação está fora do lugar</td>
                    <td className="px-3 py-2">Botão <strong>girar</strong> (↻): gira a rotação inicial e recalcula o set</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Encerrou o set sem querer</td>
                    <td className="px-3 py-2">Botão <strong>Reabrir set</strong></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2">Escalação ou formação errada</td>
                    <td className="px-3 py-2">Reabra <strong>Escalação</strong> / <strong>Formação do set</strong> e salve de novo</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Erro antigo, de vários rallies atrás</td>
                    <td className="px-3 py-2">Tela de <strong>estatísticas</strong>: dá para editar ou excluir a ação</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs leading-5 text-amber-900">
              O <strong>Ctrl + Z</strong> é um desfazer de digitação, não um histórico da partida:
              vale só para o set aberto na tela e some ao fechar a tela. Substituição e encerramento
              de set ficam fora dele de propósito — os dois têm conserto próprio, na tabela acima.
            </p>
          </Secao>

          {/* ------------------------------------------------------ Relatórios */}
          <Secao
            id="relatorios"
            titulo="O que sai nos relatórios"
            icone={<FileText size={18} className="text-gray-700" />}
          >
            <p className="mb-3 leading-6">
              A tela de estatísticas da partida — e o PDF que sai dela — reúne tudo que foi
              escoutado:
            </p>

            <ul className="list-disc space-y-1 pl-5 leading-6">
              <li><strong>Scout por jogador</strong>: ações, pontos conquistados e cedidos, e a quebra por fundamento e por nível de qualidade.</li>
              <li><strong>Rotações</strong>: side-out % e break % de R1 a R6, com o saldo de cada uma, o corte da dupla substituição e o resumo por set.</li>
              <li><strong>Adversário</strong>: por fundamento e por camisa, incluindo os erros dele — que são os pontos que a sua equipe ganhou sem precisar fazer nada.</li>
              <li><strong>Sets</strong>: placar e vencedor de cada um.</li>
            </ul>

            <div className="mt-4">
              <Cartao titulo="Rotação não é retroativa">
                Partidas escoutadas sem a formação declarada aparecem como{' '}
                <strong>sem rotação registrada</strong>. Não há como descobrir depois qual era o
                alinhamento inicial — por isso o passo 2 do começo deste manual importa.
              </Cartao>
            </div>
          </Secao>

          {/* ----------------------------------------------------- Observações */}
          <Secao
            id="observacoes"
            titulo="Observações importantes"
            cor="amber"
            icone={<AlertTriangle size={18} className="text-amber-700" />}
          >
            <ul className="space-y-2 list-disc pl-5 leading-6 text-amber-900">
              <li>O número da camisa é montado enquanto o <strong>Ctrl</strong> (sua equipe) ou o <strong>Alt</strong> (adversário) está pressionado.</li>
              <li>Quem manda no lado do lance é o <strong>primeiro</strong> modificador apertado: começou no Alt, o lance inteiro é do adversário.</li>
              <li>A ação só é aceita depois que um número foi digitado.</li>
              <li>A qualidade só é registrada depois que a ação já foi definida.</li>
              <li>Um rally decidido <strong>só no placar</strong>, sem nenhuma ação escoutada, também fica registrado — ele aparece no painel sem dono e conta na rotação.</li>
              <li>O placar <strong>trava</strong> quando o set já está decidido: só aceita correção para baixo, ou o encerramento do set.</li>
              <li>Tudo é gravado na hora. Não existe botão de salvar, e fechar a tela não perde nada.</li>
            </ul>
          </Secao>
        </div>
      </div>
    </div>
  );
}

export default HelpScoutModal;
