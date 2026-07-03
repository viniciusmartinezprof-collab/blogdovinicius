# Espaço de Aulas de Cálculo Numérico

Este projeto é um painel de aulas em React para um curso de Cálculo Numérico
baseado no curso do professor João Godim.

A proposta é simples:

- o aluno vê apenas as aulas já liberadas;
- os módulos mais recentes aparecem primeiro;
- o conteúdo de cada card é editado manualmente;
- a liberação de novos módulos é controlada por um único número.

## Visão geral

Hoje a aplicação possui:

- cabeçalho;
- campo de busca;
- contadores de progresso;
- cards dos módulos liberados;
- rodapé.

As aulas não vêm de API nem de banco de dados.
Todo o conteúdo está em um arquivo local, o que facilita a manutenção e o estudo.

## Onde editar o conteúdo

O principal arquivo de conteúdo é:

- [src/data/lessons.js](/home/vinicius/codes/reactapp/src/data/lessons.js:1)

É nele que você edita:

- `releasedModuleCount`: quantos módulos já estão liberados;
- `title`: título do módulo;
- `summary`: descrição principal do card;
- `area`: área temática exibida no card;
- `note`: observação complementar exibida no card.

Exemplo:

```js
{
  title: "Método da Bisseção",
  summary: "Método iterativo com garantia de convergência em intervalo válido.",
  area: "Zeros de Funções",
  note: "Excelente primeiro método para estudo por ser simples e robusto.",
}
```

## Como liberar novos módulos

No mesmo arquivo `src/data/lessons.js`, altere:

```js
export const releasedModuleCount = 1;
```

Se você trocar para `2`, o segundo módulo passa a ficar visível para o aluno.

## Ordem de leitura para entender o projeto

Se alguém abrir este projeto sem conhecer a estrutura, esta é uma boa ordem:

1. `README.md`
2. `package.json`
3. `index.html`
4. `src/main.jsx`
5. `src/App.jsx`
6. `src/data/lessons.js`
7. `src/components/LessonCard.jsx`
8. `src/components/Header.jsx`
9. `src/components/Footer.jsx`
10. `src/styles.css`

## Como o projeto funciona

Fluxo geral:

1. O navegador abre `index.html`.
2. O React entra na `<div id="root"></div>`.
3. `src/main.jsx` renderiza o componente `App`.
4. `src/App.jsx` organiza a tela.
5. `src/App.jsx` lê os dados de `src/data/lessons.js`.
6. `LessonCard.jsx` renderiza cada card.
7. `styles.css` cuida da aparência visual.

## Estrutura atual

```text
.
|-- index.html
|-- package.json
|-- src
|   |-- App.jsx
|   |-- main.jsx
|   |-- styles.css
|   |-- components
|   |   |-- Footer.jsx
|   |   |-- Header.jsx
|   |   `-- LessonCard.jsx
|   `-- data
|       `-- lessons.js
`-- README.md
```

## O papel de cada arquivo

### `src/main.jsx`

É o ponto de entrada do React.

Forma simples de entender:

- importa o componente principal;
- encontra a `div` com id `root`;
- manda o React desenhar a aplicação ali.

### `src/App.jsx`

É o arquivo principal da tela.

Ele:

- prepara os dados das aulas;
- controla a busca;
- separa o que deve aparecer para o aluno;
- ordena os módulos do mais recente para o mais antigo;
- renderiza os cards.

### `src/data/lessons.js`

É o arquivo de conteúdo.

Nele ficam:

- a quantidade de módulos liberados;
- os dados individuais de cada card.

### `src/components/LessonCard.jsx`

Renderiza cada card de módulo.

### `src/components/Header.jsx`

Renderiza o topo da página.

### `src/components/Footer.jsx`

Renderiza o rodapé.

### `src/styles.css`

Controla o visual da aplicação:

- tipografia;
- cores;
- espaçamentos;
- layout dos cards;
- responsividade.

## Como rodar o projeto

```bash
npm run dev
```

Depois, abra a URL exibida pelo Vite no terminal.
Normalmente será algo como:

```text
http://localhost:5173
```

## Resumo rápido

Se você quiser guardar a ideia principal:

`main.jsx` inicia o React, `App.jsx` monta a tela, `lessons.js` guarda o conteúdo dos módulos, `LessonCard.jsx` renderiza cada aula e `styles.css` cuida da aparência.
