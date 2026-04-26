# Função de Substituição no VolleyStats

## 📋 Descrição Geral

Implementação completa da funcionalidade de **Substituição de Atletas** no sistema VolleyStats, seguindo as regras oficiais de voleibol e o padrão MVC (Model-View-Control) do projeto.

## 📁 Arquivos Criados/Modificados

### 1. **Model** - `src/Model/SubstituicaoModel.js`
Responsável pela persistência e consulta de dados de substituição no banco de dados.

#### Métodos Principais:
- **`insert(substituicao, db)`** - Insere uma nova substituição
- **`findByPartida(partidaId, db)`** - Busca todas as substituições de uma partida
- **`findByPartidaAndTime(partidaId, timeId, db)`** - Busca substituições de um time específico
- **`findById(id, db)`** - Busca uma substituição específica
- **`delete(id, db)`** - Remove uma substituição
- **`countTotalInSet(pontoTime1, pontoTime2, partidaId, db)`** - Conta substituições no set (limite de 6)

### 2. **Control** - `src/Control/SubstituicaoControl.js`
Gerencia a lógica de negócio e validação das substituições.

#### Métodos Principais:
- **`registrarSubstituicao(data)`** - Registra uma substituição com validações
  - Valida limite de 6 substituições por set
  - Verifica existência dos jogadores
  - Transação de banco de dados garantida
  
- **`validarSubstituicao(data)`** - Valida se substitução pode ser realizada
  - Retorna detalhes da validação
  - Lista de mensagens de erro

- **`obterHistoricoSubstituicoes(partidaId)`** - Recupera histórico completo

- **`obterSubstituicoesDoTime(partidaId, timeId)`** - Histórico por time

- **`obterEstatisticasSubstituicoes(partidaId)`** - Estatísticas de substituições

- **`removerSubstituicao(substituicaoId)`** - Remove uma substituição (desfazer)

### 3. **View** - Integração em `src/View/Partida/ControlePartida.js`

#### Alterações Realizadas:

1. **Import do Control e ícones**:
```javascript
import SubstituicaoControl from '../../Control/SubstituicaoControl';
import { AlertCircle, CheckCircle } from 'lucide-react';
```

2. **Novo Estado**:
```javascript
const [substitucaoMessage, setSubstitucaoMessage] = useState({ 
  type: '', 
  text: '', 
  visible: false 
});
```

3. **Função Melhorada `handleSubstituir()`**:
   - Valida substituição antes de processar
   - Registra no banco de dados
   - Mostra feedback visual (sucesso/erro)
   - Atualiza UI localmente
   - Adiciona registro no feed da partida

4. **Interface Aprimorada**:
   - Mensagem de status (sucesso/erro) no modal
   - Feed atualizado com ícone de substituição
   - Desabilita botão quando não há seleção válida

## 🎯 Regras de Voleibol Implementadas

### Limite de Substituições
- **Máximo 6 substituições por set** (regra oficial)
- Sistema valida e impede substituição após atingir limite

### Jogadores
- Sempre há 6 jogadores em campo
- Jogadores podem ser substituídos várias vezes
- Qualquer jogador do banco pode entrar

### Registro
- Substituição registrada com pontos de entrada/saída
- Histórico completo mantido no banco
- Rastreabilidade total do jogo

## 📊 Estrutura de Dados - Tabela `Substituicao`

```sql
CREATE TABLE Substituicao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  Ponto_pontoTime1 INTEGER NOT NULL,      -- Pontuação time 1 no momento
  Ponto_pontoTime2 INTEGER NOT NULL,      -- Pontuação time 2 no momento
  Ponto_Partida_id INTEGER NOT NULL,      -- ID da partida
  JogadorEntra INTEGER NOT NULL,          -- ID do jogador que entra
  JogadorSai INTEGER NOT NULL,            -- ID do jogador que sai
  FOREIGN KEY (Ponto_pontoTime1, Ponto_pontoTime2) 
    REFERENCES Ponto(pontoTime1, pontoTime2),
  FOREIGN KEY (JogadorEntra) REFERENCES Jogadores(id),
  FOREIGN KEY (JogadorSai) REFERENCES Jogadores(id)
);
```

## 🔄 Fluxo de Uso

### 1. Usuário clica "Substituição" na tela de controle
```
ControlePartida → showSubstituicao = true
```

### 2. Modal abre com seleções
```
- Coluna esquerda: Jogadores em campo
- Coluna direita: Banco de reservas
```

### 3. Usuário seleciona:
- 1️⃣ Jogador em campo (quem sai)
- 2️⃣ Jogador no banco (quem entra)

### 4. Clica "Confirmar Troca"
```
handleSubstituir() → 
  ├─ Valida: validarSubstituicao()
  ├─ Registra: registrarSubstituicao()
  ├─ Atualiza UI (escalados)
  ├─ Mostra mensagem (sucesso/erro)
  └─ Adiciona ao feed
```

### 5. Sistema Responde
```
✅ Sucesso:
   - Jogadores trocados em campo
   - Mensagem verde de confirmação
   - Modal fecha automaticamente
   - Feed atualizado

❌ Erro:
   - Mensagem vermelha com motivo
   - Modal permanece aberto
   - Usuário pode tentar novamente
```

## ⚙️ Validações Implementadas

| Validação | Descrição | Resposta |
|-----------|-----------|----------|
| Limite de 6 | Mais de 6 no set | ❌ "Limite de 6 substituições..." |
| Jogadores Válidos | Jogador não existe | ❌ "Jogador não encontrado..." |
| Jogadores Diferentes | Mesmo jogador sai e entra | ❌ "Jogadores não podem ser iguais" |
| Seleção Completa | Faltam seleções | ❌ Botão desabilitado |

## 💾 Exemplo de Resposta da API

### Substituição com Sucesso:
```javascript
{
  success: true,
  message: "Substituição registrada com sucesso",
  substituicaoId: 42,
  data: {
    jogadorEntra: 5,
    jogadorSai: 12,
    pontoTime1: 15,
    pontoTime2: 18
  }
}
```

### Validação com Erro:
```javascript
{
  success: false,
  message: "Limite de 6 substituições por set atingido",
  code: 'LIMIT_EXCEEDED'
}
```

## 🧪 Testando a Funcionalidade

### 1. Na tela de controle de partida:
```
1. Clique no botão "Substituição" (inferior/central)
2. Modal abre com escalação
3. Clique em um jogador em campo
4. Clique em um jogador no banco
5. Clique "Confirmar Troca"
```

### 2. Verificar Banco de Dados:
```sql
SELECT * FROM Substituicao WHERE Ponto_Partida_id = 1;
```

### 3. Consultar Histórico no Code:
```javascript
const control = new SubstituicaoControl();
const historico = await control.obterHistoricoSubstituicoes(1);
console.log(historico);
```

## 📈 Próximas Melhorias Possíveis

- [ ] Visualizar histórico de substituições em tempo real
- [ ] Desfazer última substituição (botão Undo)
- [ ] Relatório pós-partida com estatísticas
- [ ] Avisos quando faltam jogadores no banco
- [ ] Integração com sistema de cards (quando implementado)
- [ ] Sincronização em tempo real para múltiplos visualizadores

## 📝 Notas Importantes

1. **Banco de Dados**: Certifique-se que a tabela `Substituicao` existe (criada pelo script db.js)
2. **Transações**: Todas as inserções usam transações para garantir integridade
3. **Feedback**: Sempre há feedback visual ao usuário (sucesso/erro)
4. **Feed**: Cada substituição aparece no feed da partida com ícone 🔄
5. **Pontos**: Registro captura exatamente em qual ponto a substituição ocorreu

---

**Data de Implementação**: 26 de abril de 2026
**Status**: ✅ Implementado e testado
**Limite Correto**: 6 substituições por set
