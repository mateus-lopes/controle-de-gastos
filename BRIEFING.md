# Controle de Gastos — Briefing do Sistema

## Objetivo

Criar um sistema web de controle financeiro pessoal para dois usuários (Mateus e Thiago), cada um com dados completamente separados. O sistema substitui uma planilha Excel que é difícil de manter e de usar no celular.

---

## Stack

Mesma do projeto `thiago-excel`:
- **Frontend:** Vue 3 + Vite + Pinia + Vue Router
- **Backend:** Node.js + Express
- **Banco:** PostgreSQL + Drizzle ORM
- **Auth:** Cookie HttpOnly (mesmo padrão de segurança do sistema atual)
- **Layout:** Responsivo, mobile-first — o principal caso de uso é celular

---

## Usuários

- Dois usuários fixos: **Mateus** e **Thiago**
- Cada um faz login separado e vê apenas os próprios dados
- Não há visão compartilhada entre os dois

---

## Funcionalidades

### 1. Dashboard (tela inicial)
- Saldo do mês: total entradas − total saídas
- Gráfico de gastos por categoria (pizza ou barras horizontais)
- Cards de faturas dos cartões com status pago/pendente
- Lista de pendências do mês (contas e parcelas ainda não pagas)
- Bloco de progresso de investimento

### 2. Entradas
- **Fixas:** salário, aluguel recebido, etc. — cadastradas uma vez, repetem todo mês
- **Variáveis:** entradas avulsas com descrição, valor e data

### 3. Saídas Fixas
- Contas recorrentes (aluguel, condomínio, telefone, contabilidade, etc.)
- Cada item tem nome, valor e status pago/pendente por mês

### 4. Parcelas
- Compras parceladas: descrição, valor da parcela, parcela atual e total (ex: 3/12)
- Avança automaticamente a cada mês até quitar
- Aparecem como pendência no dashboard enquanto não pagas

### 5. Gastos Variáveis Diários
- Lançamentos avulsos: descrição, valor, data, categoria, forma de pagamento (débito / crédito / dinheiro / cartão específico)
- Lista filtrável por categoria, período e forma de pagamento

### 6. Cartões de Crédito
- Cada usuário cadastra seus próprios cartões (nome livre)
- Fatura mensal por cartão com valor e status pago/pendente
- Os gastos lançados como "crédito no cartão X" entram na fatura do mês correspondente

### 7. Investimentos
- Blocos flexíveis por tipo de investimento
- **Mateus:** imóvel — aporte mensal (gasto), sem retorno ainda
- **Thiago:** Nubank — aporte mensal com meta de valor total e barra de progresso
- Estrutura deve permitir adicionar novos tipos no futuro sem retrabalho

### 8. Categorias
- Cada usuário gerencia suas próprias categorias (CRUD completo)
- Sistema começa vazio — sem categorias pré-definidas
- Usadas nos gastos variáveis para agrupamento e gráficos

---

## UX / Interface

- **Navegação por barra inferior** (não sidebar) — padrão mobile
- **Botão flutuante "+"** para lançar gasto rapidamente sem navegar por menus
- Formulário de lançamento rápido: descrição, valor, data (hoje por padrão), categoria, forma de pagamento
- Cards tocáveis com tamanho adequado para toque
- Sem tabelas densas — listas com cards
- Tema escuro (igual ao sistema thiago-excel)
- Visão mensal com navegação por setas (mês anterior / próximo)

---

## Dados da Planilha do Thiago (referência visual)

A planilha atual do Thiago (`FINANÇAS 2026.xlsx`) tem a seguinte estrutura mensal:
- Entradas fixas (salário, comissão, aluguel de inquilinos)
- Entradas variáveis (parcelas recebidas de vendas)
- Saídas fixas (apartamento, condomínio, TIM, contabilidade, carro, seguro, etc.)
- Parcelas a pagar (com X/Y meses)
- Faturas de cartões (Nubank, Caixa, Sicoob, Havan, Nubank PJ)
- Gastos variáveis diários com: descrição, tipo (crédito/débito), valor, data, categoria
- Metas de reserva (emergencial e Nubank) com meta total, reservado e faltante

**No futuro:** migrar os dados históricos do Excel para o sistema. Não implementar agora.

---

## O que NÃO entra no escopo inicial

- Importação de extratos bancários (OFX, CSV)
- Notificações / lembretes de vencimento
- Relatórios exportáveis (PDF/Excel)
- Múltiplos perfis por usuário
- Migração dos dados históricos do Thiago

Essas funcionalidades podem ser adicionadas depois.

---

## Estrutura sugerida de pastas

```
controle-de-gastos/
├── backend/
│   ├── src/
│   │   ├── db/          # schema Drizzle + migrations
│   │   ├── routes/      # endpoints REST
│   │   └── middleware/  # auth, validação
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── views/       # Dashboard, Lancamentos, Cartoes, etc.
│   │   ├── components/
│   │   ├── stores/      # Pinia
│   │   └── router/
│   └── package.json
└── BRIEFING.md
```

---

## Próximos passos sugeridos ao iniciar

1. Inicializar backend (Express + Drizzle + PostgreSQL)
2. Criar schema do banco com as entidades principais
3. Implementar autenticação (dois usuários, cookie HttpOnly)
4. Inicializar frontend Vue 3 com roteamento e layout mobile
5. Implementar Dashboard com dados mockados para validar o visual
6. Implementar lançamento rápido de gastos
7. Implementar cartões, categorias e demais módulos
