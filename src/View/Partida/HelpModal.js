import React from 'react';
import { HelpCircle, X, Keyboard, ArrowUp, ArrowDown } from 'lucide-react';

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
              <li>Segure a tecla <strong>Ctrl</strong>.</li>
              <li>Digite o número da camisa do jogador.</li>
              <li>Solte o <strong>Ctrl</strong>.</li>
              <li>Pressione a tecla da ação: <strong>S</strong>, <strong>A</strong>, <strong>B</strong>, <strong>R</strong> ou <strong>D</strong>.</li>
              <li>Depois pressione a qualidade da ação: <strong>A</strong>, <strong>B</strong> ou <strong>C</strong>.</li>
            </ol>

            <div className="mt-4 rounded-2xl bg-white border border-gray-200 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                Exemplo
              </p>
              <p className="leading-6">
                Para registrar um ataque de qualidade A do jogador camisa 12:
                <br />
                <strong>Ctrl + 1 + 2</strong> → depois <strong>A</strong> (ação: ataque) → depois <strong>A</strong> (qualidade).
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
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 mb-3">
              Qualidade da ação
            </h3>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>A</strong> = Qualidade A</div>
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>B</strong> = Qualidade B</div>
              <div className="rounded-2xl bg-white border border-gray-200 p-4"><strong>C</strong> = Qualidade C</div>
            </div>
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
                  <p className="text-xs text-gray-500 mt-1">Aumenta o ponto do mandante.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-4 flex items-center gap-3">
                <ArrowUp size={18} className="text-orange-500" />
                <div>
                  <strong>Alt + ↑</strong>
                  <p className="text-xs text-gray-500 mt-1">Aumenta o ponto do visitante.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-4 flex items-center gap-3">
                <ArrowDown size={18} className="text-gray-700" />
                <div>
                  <strong>Shift + ↓</strong>
                  <p className="text-xs text-gray-500 mt-1">Diminui o ponto do mandante.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-4 flex items-center gap-3">
                <ArrowDown size={18} className="text-orange-500" />
                <div>
                  <strong>Alt + ↓</strong>
                  <p className="text-xs text-gray-500 mt-1">Diminui o ponto do visitante.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-amber-800 mb-3">
              Observações importantes
            </h3>

            <ul className="space-y-2 list-disc pl-5 leading-6 text-amber-900">
              <li>O número da camisa é montado enquanto o <strong>Ctrl</strong> está pressionado. [file:11]</li>
              <li>A ação só é aceita depois que um número foi digitado. [file:11]</li>
              <li>A qualidade só é registrada depois que a ação já foi definida. [file:11]</li>
              <li><strong>Esc</strong> limpa o buffer atual de digitação do scout. [file:11]</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default HelpScoutModal;