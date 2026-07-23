# Portal de disciplinas

Este projeto é um site acadêmico para reunir materiais de disciplinas. A pessoa que acessa o site escolhe uma disciplina e vê os materiais que já foram liberados.

Hoje existem dois espaços:

- **Cálculo Numérico**: possui materiais cadastrados.
- **Cálculo Diferencial e Integral I**: possui página própria e está pronto para receber materiais.

O portal não usa banco de dados nem painel administrativo. As disciplinas e os materiais ficam em arquivos simples do projeto, para que possam ser editados diretamente.

## A ideia em linguagem simples

Imagine o site como uma biblioteca digital.

1. `courses.js` é o catálogo de disciplinas.
2. `lessons.js` é, por enquanto, a lista de materiais de Cálculo Numérico.
3. O React lê essas listas e cria as telas automaticamente.
4. Os componentes são peças reutilizáveis: catálogo, cabeçalho, card e rodapé.
5. O CSS define a aparência acadêmica, fontes, cores e versão para celular.

Assim, não é necessário criar manualmente um card no HTML: ao colocar um item na lista, o site cria o card correspondente.

## Como a página funciona

```text
Navegador
  → index.html abre um espaço vazio chamado #root
  → src/main.jsx inicia o React nesse espaço
  → src/App.jsx organiza o site
       ├─ lê src/data/courses.js
       ├─ mostra CourseCatalog.jsx para escolher uma disciplina
       └─ depois da escolha:
            ├─ Header.jsx mostra os dados da disciplina
            ├─ App.jsx filtra e ordena os materiais
            ├─ PostCard.jsx desenha cada material
            └─ Footer.jsx desenha o rodapé
```

Em outras palavras, `App.jsx` é o organizador: ele decide o que aparece, enquanto os componentes desenham cada parte.

## Como o estudante navega

1. A tela inicial mostra as disciplinas cadastradas.
2. **Acessar disciplina** abre o espaço escolhido.
3. **← Disciplinas** retorna ao catálogo.
4. A busca procura por título, resumo, área ou número do material.
5. Um card com link abre o material em outra aba. Sem link, ele informa que o material está em preparação.

A escolha da disciplina e o texto da busca são guardados somente enquanto a página está aberta. Ao atualizar o navegador, o site volta ao catálogo. Em uma evolução futura, React Router pode criar endereços próprios para cada disciplina.

## Estrutura do projeto

```text
.
├── index.html                    # primeira página aberta pelo navegador
├── package.json                  # tecnologias e comandos disponíveis
├── vite.config.ts                # configuração do Vite
├── src/
│   ├── main.jsx                  # ponto de partida do React
│   ├── App.jsx                   # seleção, busca e materiais visíveis
│   ├── styles.css                # aparência e responsividade
│   ├── Contador.jsx              # exemplo de estudo; não aparece no portal
│   ├── components/
│   │   ├── CourseCatalog.jsx     # catálogo de disciplinas
│   │   ├── Header.jsx            # topo, navegação e busca
│   │   ├── PostCard.jsx          # card de cada material
│   │   └── Footer.jsx            # rodapé
│   └── data/
│       ├── courses.js            # cadastro das disciplinas
│       └── lessons.js            # materiais de Cálculo Numérico
└── dist/                         # versão pronta para publicação, gerada automaticamente
```

> O nome `lessons.js` vem de uma versão anterior. Apesar do nome, ele exporta os materiais usados por Cálculo Numérico.

## Quem chama quem

| Arquivo | Responsabilidade | É chamado por |
|---|---|---|
| `index.html` | Oferece o espaço onde o site será desenhado. | Navegador |
| `src/main.jsx` | Inicia o React e chama o componente principal. | `index.html` |
| `src/App.jsx` | Controla disciplina escolhida, busca e materiais. | `main.jsx` |
| `src/data/courses.js` | Guarda os dados de cada disciplina. | `App.jsx` e `CourseCatalog.jsx` |
| `src/data/lessons.js` | Guarda os materiais de Cálculo Numérico. | `courses.js` |
| `CourseCatalog.jsx` | Desenha a seleção inicial. | `App.jsx` |
| `Header.jsx` | Desenha o cabeçalho e recebe a busca. | `App.jsx` |
| `PostCard.jsx` | Desenha um material individual. | `App.jsx` |
| `Footer.jsx` | Desenha o rodapé. | `App.jsx` |
| `styles.css` | Aplica o visual a todos os componentes. | `main.jsx` |

## Onde editar as disciplinas

Abra [src/data/courses.js](./src/data/courses.js). Cada bloco entre chaves representa uma disciplina:

```js
{
  id: "calculo-diferencial-integral-1",
  title: "Cálculo Diferencial e Integral I",
  code: "CDI I",
  workload: "67 horas",
  institution: "Instituto Federal do Paraná · Campus Ivaiporã",
  teacher: "Nome do docente",
  description: "Curso e período da turma.",
  status: "Em preparação",
  materials: [],
  publishedMaterialCount: 0,
}
```

O significado dos campos:

- `id`: nome interno único, sem espaços;
- `title`: nome grande mostrado na página;
- `code` e `workload`: informações complementares;
- `institution`, `teacher` e `description`: textos do cabeçalho;
- `status`: texto no catálogo, como `Disponível` ou `Em preparação`;
- `materials`: lista dos materiais daquela disciplina;
- `publishedMaterialCount`: quantos itens da lista ficam visíveis.

### Como incluir uma nova disciplina

1. Abra `src/data/courses.js`.
2. Copie um objeto de disciplina existente.
3. Altere os textos e escolha um `id` novo.
4. Para iniciar sem conteúdo, mantenha `materials: []` e `publishedMaterialCount: 0`.
5. Salve. Com o servidor de desenvolvimento aberto, o navegador costuma atualizar automaticamente.

Quando uma disciplina tiver muitos materiais, o ideal é criar um arquivo em `src/data/` só para ela e importá-lo em `courses.js`.

## Onde editar materiais

Os materiais atuais de Cálculo Numérico estão em [src/data/lessons.js](./src/data/lessons.js). Cada objeto cria um card:

```js
{
  title: "Sistemas de Numeração",
  summary: "Bases numéricas, conversões e representação de valores.",
  area: "Fundamentos",
  note: "Revisão conceitual para preparar os próximos materiais.",
  postUrl: "https://...", // opcional
}
```

- `title`: título do card;
- `summary`: explicação curta;
- `area`: tema ou unidade;
- `note`: observação exibida em itálico;
- `postUrl`: link para PDF, Google Drive ou outro material. Se estiver ausente, o card mostra “Material em preparação”.

### Como liberar mais materiais

No início de `lessons.js`, há uma linha semelhante a:

```js
export const publishedPostCount = 1;
```

Trocar para `2` libera os dois primeiros itens; trocar para `3`, os três primeiros. O último material liberado recebe o selo **Recém-liberado**. Na tela, os materiais são exibidos do mais recente para o mais antigo.

## Tecnologias usadas

| Tecnologia | Em palavras simples | Papel no portal |
|---|---|---|
| HTML | Estrutura de uma página web. | `index.html` abre o site. |
| CSS | Regras de aparência. | Define layout, cores, fontes e celular. |
| JavaScript | Linguagem que dá comportamento à página. | Controla seleção, busca e links. |
| React | Biblioteca para interfaces em componentes. | Monta as telas a partir dos dados. |
| React DOM | Ponte entre React e navegador. | Coloca React dentro da página. |
| Vite | Ferramenta de desenvolvimento e compilação. | Executa e gera o projeto. |
| npm | Gerenciador de pacotes do Node.js. | Instala dependências e executa comandos. |

O projeto também possui `lucide-react` instalado para o arquivo de estudo `Contador.jsx`; ele não é usado na interface atual.

### Tipografia e visual

`styles.css` carrega **STIX Two Text**, uma fonte adequada a texto acadêmico e notação científica, e usa **IBM Plex Mono** em etiquetas técnicas. As fontes vêm do Google Fonts quando há internet; sem conexão, o navegador usa fontes de reserva.

## Como executar no computador

É necessário ter [Node.js](https://nodejs.org/) instalado. O projeto indica Node.js 22.

Na pasta do projeto, abra um terminal e execute:

```bash
npm install
npm run dev
```

O terminal mostrará um endereço parecido com:

```text
http://localhost:5173
```

Abra esse endereço no navegador. Para encerrar o servidor, pressione `Ctrl + C` no terminal.

## Como gerar a versão para publicação

```bash
npm run build
```

Esse comando gera a pasta `dist/`, que contém arquivos otimizados para publicar. Não edite essa pasta manualmente: ela é recriada a cada compilação.

Para visualizar a versão compilada localmente:

```bash
npm run start
```

## Limites atuais e próximos passos

Esta versão ainda não possui banco de dados, login, painel de cadastro, URLs próprias por disciplina, páginas internas de leitura ou acompanhamento de progresso do estudante.

Uma evolução natural seria:

1. cadastrar materiais de CDI I;
2. criar páginas e endereços próprios com React Router;
3. criar formulário para cadastrar materiais;
4. trocar arquivos locais por API e banco de dados;
5. adicionar login para restringir a edição.

## Resumo final

`main.jsx` inicia o React; `App.jsx` decide qual tela mostrar; `courses.js` informa as disciplinas; os arquivos de dados fornecem os materiais; os componentes desenham as partes da tela; e `styles.css` cria a identidade visual acadêmica.
