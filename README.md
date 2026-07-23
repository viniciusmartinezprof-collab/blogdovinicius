# Blog pessoal

Este é o blog pessoal de Vinícius, construído em React. Ele começa como uma
coleção de publicações curtas e pode evoluir, durante a mentoria de tecnologia,
para um blog completo com páginas, formulário, API, banco de dados e login.

## O que já funciona

- cabeçalho e apresentação do blog;
- busca por título, resumo, área ou número da publicação;
- cards de publicações, ordenados da mais recente para a mais antiga;
- destaque visual para a publicação mais recente;
- abertura de uma leitura externa quando houver link;
- adaptação para telas pequenas.

Neste momento não há servidor nem banco de dados: os textos ficam em um
arquivo do próprio projeto. Essa escolha é intencional e corresponde a uma
etapa inicial da jornada de construção do blog.

## Onde editar as publicações

O conteúdo está em [src/data/lessons.js](./src/data/lessons.js). Embora o nome
do arquivo seja legado da versão anterior do projeto, ele agora exporta `posts`.
Cada item representa uma publicação:

```js
{
  title: "Sistemas de Numeração",
  summary: "Bases numéricas, conversões e representação de valores.",
  area: "Fundamentos",
  note: "Revisão conceitual para preparar os próximos textos.",
  postUrl: "https://...", // opcional
}
```

Para exibir mais publicações, altere no mesmo arquivo:

```js
export const publishedPostCount = 4;
```

Por exemplo, trocar para `5` publica o quinto item da lista. Itens posteriores
continuam como rascunho e não aparecem no site público.

## Estrutura

```text
src/
├── main.jsx              # inicia o React
├── App.jsx               # prepara, filtra e exibe as publicações
├── styles.css            # aparência e responsividade
├── components/
│   ├── Header.jsx         # topo e busca
│   ├── PostCard.jsx       # card de cada publicação
│   └── Footer.jsx         # rodapé
└── data/
    └── lessons.js        # textos e regra de publicação
```

## Como executar

```bash
npm install
npm run dev
```

Abra no navegador o endereço exibido no terminal, normalmente
`http://localhost:5173`.

Para gerar a versão de produção:

```bash
npm run build
```

## Próximas evoluções na mentoria

1. Trocar os links externos por páginas próprias de cada post.
2. Criar uma tela/formulário para escrever publicações.
3. Guardar os posts no navegador e depois em uma API.
4. Usar PostgreSQL, login, testes e publicação em produção.
