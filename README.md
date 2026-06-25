# React App

Este projeto e uma aplicacao React bem inicial, criada de forma manual e executada com Vite. No estado atual, ele serve como base de estudo e experimentacao para componentes, renderizacao e gerenciamento de estado com `useState`.

## Visao geral

Hoje a aplicacao possui:

- renderizacao do React a partir do arquivo `src/main.jsx`
- componente principal `App`
- componente `Contador` com estado local
- pagina HTML simples com ponto de montagem em `#root`

Ao abrir a aplicacao, o usuario ve uma mensagem inicial e um contador com botoes para incrementar e decrementar o valor exibido na tela.

## Tecnologias utilizadas

- React `19.2.7`
- React DOM `19.2.7`
- Vite `8.0.16`
- Node.js `22.23.0` via Volta

## Estrutura atual

```text
.
|-- index.html
|-- package.json
|-- src
|   |-- App.jsx
|   |-- Contador.jsx
|   `-- main.jsx
`-- README.md
```

## Como o projeto funciona

### `index.html`

Define a estrutura HTML minima da pagina e o elemento `<div id="root"></div>`, onde a aplicacao React e montada.

### `src/main.jsx`

E o ponto de entrada do React. Esse arquivo importa o componente `App` e o renderiza no elemento `root` usando `createRoot`.

### `src/App.jsx`

Componente principal da interface. Ele exibe:

- um titulo
- um texto introdutorio
- o componente `Contador`

### `src/Contador.jsx`

Componente responsavel pelo contador. Usa `useState(0)` para armazenar o valor atual e oferece dois botoes:

- `+` para incrementar
- `-` para decrementar

## Como executar

### 1. Instalar dependencias

```bash
npm install
```

### 2. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

O Vite vai informar no terminal a URL local, normalmente algo como:

```text
http://localhost:5173
```

## Scripts disponiveis

No momento, o projeto possui apenas o script abaixo:

```bash
npm run dev
```

Esse comando inicia o ambiente de desenvolvimento com recarregamento automatico.

## Estado atual do projeto

Este projeto ainda esta em uma fase inicial. Ate o momento:

- nao ha roteamento
- nao ha estilizacao dedicada com CSS
- nao ha testes automatizados
- nao ha script de build configurado no `package.json`
- nao ha integracao com API ou backend

## Proximos passos possiveis

Algumas evolucoes naturais para este projeto seriam:

- adicionar estilos para a interface
- criar novos componentes reutilizaveis
- incluir um script de build
- configurar lint e formatacao
- adicionar testes
- organizar melhor a estrutura conforme o projeto crescer

## Objetivo atual

Neste momento, o repositorio funciona bem como uma base simples para aprender:

- composicao de componentes React
- renderizacao com Vite
- manipulacao de estado local com `useState`

---

Se quiser, no proximo passo eu tambem posso transformar esse README em uma versao mais "profissional", com badges, secao de roadmap e instrucoes para contribuicao.
