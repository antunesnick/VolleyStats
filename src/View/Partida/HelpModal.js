import React from 'react';
import { HelpCircle, X, Keyboard, ArrowUp, ArrowDown, Undo2 } from 'lucide-react';
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

function HelpScoutModal({ open, onClose }) {
  if (!open) return null;

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
                Atalhos do Scout
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

        <div className="space-y-6 text-sm text-gray-700">
          <section className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Keyboard size={18} className="text-gray-700" />
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-700">
                Fluxo correto do scout
              </h3>
            </div>

            <ol className="space-y-2 list-decimal pl-5 leading-6">
              <li>
                Segure <strong>Ctrl</strong> para a <strong>sua equipe</strong> ou{' '}
                <strong>Alt</strong> para o <strong>adversário</strong>.
              </li>
              <li>Digite o número da camisa do jogador.</li>
              <li>Solte o modificador.</li>
              <li>Pressione a tecla da ação: <strong>S</strong>, <strong>A</strong>, <strong>B</strong>, <strong>R</strong> ou <strong>D</strong>.</li>
              <li>Depois pressione a qualidade da ação: <strong>1</strong> a <strong>6</strong>, do erro ao ponto.</li>
            </ol>

            <div className="mt-4 rounded-2xl bg-white border border-gray-200 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                Exemplo
              </p>
              <p className="leading-6">
                Para registrar um ponto de ataque do jogador camisa 12:
                <br />
                <strong>Ctrl + 1 + 2</strong> → depois <strong>A</strong> (ação: ataque) → depois <strong>6</strong>,
                que grava <strong>#</strong> (ponto de ataque).
              </p>
              <p className="leading-6 mt-3">
                O mesmo lance, mas do adversário camisa 12:{' '}
                <strong>Alt + 1 + 2</strong> → <strong>A</strong> → <strong>6</strong>.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-orange-200 bg-orange-50 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-orange-700 mb-3">
              Scout do adversário
            </h3>

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

            <div className="mt-4 rounded-2xl bg-white border border-orange-200 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2">
                O que isso responde
              </p>
              <p className="leading-6">
                Quantos ataques, saques e bloqueios o adversário errou, e quantos ele converteu em
                ponto — por fundamento e por camisa. O painel lateral mostra o resumo do set aberto
                ou da partida inteira. A escala de qualidade é lida da perspectiva de quem executou:
                um ataque <strong>=</strong> do adversário é <strong>erro dele</strong>, ou seja,
                ponto seu.
              </p>
            </div>

            <p className="leading-6 mt-3 text-orange-900">
              O scout do adversário fica em separado do da sua equipe: nenhum relatório de atleta,
              ranking ou estatística da equipe muda de número por causa dele.
            </p>
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-700 mb-3">
              A quem o ponto pertence
            </h3>

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

            <div className="mt-4 rounded-2xl bg-white border border-emerald-200 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-2">
                O dono do ponto é sempre da sua equipe
              </p>
              <p className="leading-6">
                Apenas os atletas escalados da sua equipe recebem pontos. As ações do adversário
                (<strong>Alt + número</strong>) entram no resumo do adversário e <strong>não</strong>{' '}
                mudam de quem é o ponto no rally. O painel lateral mostra, em cada rally, de quem é
                o ponto — confira ali antes de seguir.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 mb-3">
              Teclas de ação
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>S</strong> = Saque</div>
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>A</strong> = Ataque</div>
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>B</strong> = Bloqueio</div>
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>R</strong> = Recepção</div>
              <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:col-span-2"><strong>D</strong> = Defesa</div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 mb-1">
              Qualidade da ação
            </h3>

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
          </section>

          <section className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 mb-3">
              Atalhos do placar
            </h3>

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
          </section>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-amber-800 mb-3">
              Observações importantes
            </h3>

            <ul className="space-y-2 list-disc pl-5 leading-6 text-amber-900">
              <li>O número da camisa é montado enquanto o <strong>Ctrl</strong> (sua equipe) ou o <strong>Alt</strong> (adversário) está pressionado.</li>
              <li>Quem manda no lado do lance é o <strong>primeiro</strong> modificador apertado: começou no Alt, o lance inteiro é do adversário.</li>
              <li>A ação só é aceita depois que um número foi digitado.</li>
              <li>A qualidade só é registrada depois que a ação já foi definida.</li>
              <li><strong>Esc</strong> limpa o buffer atual de digitação do scout.</li>
              <li><strong>Ctrl + Z</strong> desfaz o último lance: apaga a ação registrada (sua ou do adversário) ou devolve o ponto no placar. Só vale para o set aberto na tela.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default HelpScoutModal;