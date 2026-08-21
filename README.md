# Portal de Disciplinas

Portal acadêmico para disponibilizar materiais de disciplinas, com uma área pública para estudantes e uma área administrativa protegida para o docente.

O projeto está em produção como um site estático React hospedado no Render. Os conteúdos, usuários e PDFs ficam no Supabase.

## O que o portal faz hoje

Para estudantes:

- exibe um catálogo de disciplinas;
- mostra somente materiais publicados;
- permite buscar materiais por título, resumo, área ou número;
- abre links externos e PDFs em outra aba;
- oferece o Espaço Poincaré, um catálogo de simuladores matemáticos;
- simula o método da bisseção com console, gráfico e histórico de intervalos;
- simula o método da falsa posição com secantes, intervalos retidos, console e histórico completo;
- simula o método do ponto fixo com teia de aranha, órbita das aproximações e diagnóstico de convergência ou divergência;
- adapta o layout para celular.

Para o administrador:

- faz login por e-mail e senha;
- cria, edita e exclui disciplinas;
- cria, edita, publica, despublica e exclui materiais;
- envia PDFs diretamente pelo navegador;
- mantém rascunhos invisíveis para o público.

## A ideia em linguagem simples

Imagine que o portal é uma biblioteca.

- Supabase é a sala onde ficam dados, usuários e PDFs.
- React é quem monta as telas que estudantes e docente enxergam.
- Render é o endereço público que entrega o site na internet.
- A área pública é a estante que qualquer estudante consulta.
- A área /admin é o balcão reservado ao docente.

    Docente → /admin → login → cria ou altera conteúdos → Supabase guarda
    Estudante → home → disciplinas → React consulta Supabase → vê itens publicados
    Estudante → home → Espaço Poincaré → usa simuladores no navegador

## Tecnologias

| Tecnologia | Explicação simples | Uso no portal |
|---|---|---|
| HTML | Estrutura da página web. | index.html é a porta de entrada. |
| CSS | Regras de aparência. | Define identidade acadêmica e celular. |
| JavaScript | Linguagem de comportamento. | Busca, formulários, login e banco. |
| React | Biblioteca de telas reutilizáveis. | Monta catálogo, cards e administração. |
| React Router | Navegação sem recarregar. | Separa a home, disciplinas, simuladores e administração. |
| Vite | Ferramenta de desenvolvimento. | Executa e compila o projeto. |
| Supabase | Backend pronto para uso. | Banco, autenticação, regras e PDFs. |
| PostgreSQL | Banco relacional. | Guarda disciplinas e materiais. |
| Supabase Storage | Armazenamento de arquivos. | Guarda PDFs. |
| Render | Hospedagem. | Publica o site. |
| npm | Gerenciador de pacotes. | Instala e executa comandos. |

## Rotas

| Endereço | Público | Finalidade |
|---|---:|---|
| / | Sim | Página inicial com acesso às duas áreas do portal. |
| /disciplinas | Sim | Catálogo de disciplinas e materiais liberados. |
| /espaco-poincare | Sim | Catálogo de simuladores matemáticos. |
| /espaco-poincare/bissecao | Sim | Simulador interativo do método da bisseção. |
| /espaco-poincare/falsa-posicao | Sim | Simulador interativo do método da falsa posição. |
| /espaco-poincare/ponto-fixo | Sim | Simulador interativo do método do ponto fixo. |
| /admin | Não | Login e painel administrativo. |

A rota /admin aparece no navegador, mas a proteção não depende apenas de escondê-la. O Supabase verifica se a conta autenticada é administradora antes de aceitar alterações.

## Como as partes se conectam

    Navegador
      → index.html
      → src/main.jsx inicia React e BrowserRouter
      → src/App.jsx escolhe a rota
           → /      abre pages/HomePage.jsx
           → /disciplinas abre pages/PublicPortal.jsx
           → /espaco-poincare abre pages/PoincareHubPage.jsx
           → /espaco-poincare/bissecao abre pages/BisectionSimulatorPage.jsx
           → /espaco-poincare/falsa-posicao abre pages/FalsePositionSimulatorPage.jsx
           → /espaco-poincare/ponto-fixo abre pages/FixedPointSimulatorPage.jsx
           → /admin abre pages/AdminPage.jsx

Na área pública, PublicPortal busca disciplinas e materiais publicados. No Espaço Poincaré, cada página recebe os parâmetros do estudante, chama seu motor numérico e transforma as iterações em console, gráfico, controles de reprodução e tabela. Na área administrativa, AdminPage verifica login e permissão antes de abrir os formulários.

## Estrutura de arquivos

    .
    ├── .env.example                    modelo das variáveis locais
    ├── .gitignore                      protege arquivos locais com chaves
    ├── index.html                       página inicial do navegador
    ├── package.json                     dependências e comandos
    ├── vite.config.ts                   configuração do Vite
    ├── src/
    │   ├── main.jsx                     inicia React e BrowserRouter
    │   ├── App.jsx                      declara as rotas do portal
    │   ├── styles.css                   aparência pública e administrativa
    │   ├── lib/
    │   │   ├── supabase.js              cria a conexão com Supabase
    │   │   ├── mathExpression.js        interpreta expressões matemáticas seguras
    │   │   ├── bisection.js             calcula e registra as iterações da bisseção
    │   │   ├── falsePosition.js         calcula secantes e intervalos da falsa posição
    │   │   ├── fixedPoint.js            calcula a órbita e diagnostica o ponto fixo
    │   │   └── *.test.js                testa o interpretador e os três métodos
    │   ├── data/
    │   │   ├── portalApi.js             lê, grava, atualiza e envia arquivos
    │   │   ├── courses.js               arquivo legado, não usado hoje
    │   │   └── lessons.js               referência do conteúdo anterior
    │   ├── pages/
    │   │   ├── HomePage.jsx             entrada para as duas áreas do portal
    │   │   ├── PublicPortal.jsx         disciplinas e materiais públicos
    │   │   ├── PoincareHubPage.jsx      catálogo do Espaço Poincaré
    │   │   ├── BisectionSimulatorPage.jsx laboratório interativo da bisseção
    │   │   ├── FalsePositionSimulatorPage.jsx laboratório interativo da falsa posição
    │   │   ├── FixedPointSimulatorPage.jsx laboratório interativo do ponto fixo
    │   │   └── AdminPage.jsx            login e administração de materiais
    │   └── components/
    │       ├── CourseCatalog.jsx        catálogo inicial
    │       ├── PoincareSpace.jsx        catálogo de simuladores do Espaço Poincaré
    │       ├── poincare/                gráficos e terminais dos três simuladores
    │       │   ├── BisectionPlot.jsx    curva e intervalos da bisseção
    │       │   ├── IterationTerminal.jsx console de iterações da bisseção
    │       │   ├── FalsePositionPlot.jsx curva, secante e intervalo retido
    │       │   ├── FalsePositionTerminal.jsx console da falsa posição
    │       │   ├── FixedPointPlot.jsx   curvas y = g(x), y = x e teia de aranha
    │       │   └── FixedPointTerminal.jsx console da órbita do ponto fixo
    │       ├── Header.jsx               cabeçalho e busca
    │       ├── PostCard.jsx             card de material
    │       ├── AdminCourseManager.jsx   CRUD de disciplinas
    │       └── Footer.jsx               rodapé
    ├── supabase/
    │   └── 02_seed_calculo_numerico.sql migração dos materiais iniciais
    └── dist/                            versão compilada e gerada pelo build

Os arquivos courses.js e lessons.js não são mais a fonte oficial do portal. Eles permanecem apenas como referência histórica. A fonte oficial agora é o banco Supabase.

## Quem chama quem

| Arquivo | Responsabilidade | É chamado por |
|---|---|---|
| index.html | Oferece o espaço chamado root. | Navegador |
| main.jsx | Inicia React e a navegação. | index.html |
| App.jsx | Escolhe a página pelo endereço. | main.jsx |
| HomePage.jsx | Apresenta os dois caminhos de entrada do portal. | App.jsx |
| PublicPortal.jsx | Catálogo, busca e cards públicos. | App.jsx |
| PoincareHubPage.jsx | Apresenta o catálogo de simuladores. | App.jsx |
| BisectionSimulatorPage.jsx | Executa a experiência interativa da bisseção. | App.jsx |
| FalsePositionSimulatorPage.jsx | Coordena parâmetros, reprodução, gráfico, console e tabela da falsa posição. | App.jsx |
| FixedPointSimulatorPage.jsx | Coordena a órbita, a teia de aranha e o diagnóstico do ponto fixo. | App.jsx |
| bisection.js, falsePosition.js e fixedPoint.js | Validam os dados, executam os métodos numéricos e registram cada iteração. | Páginas dos simuladores |
| componentes em poincare/ | Representam visualmente as iterações em gráficos SVG e consoles didáticos. | Páginas dos simuladores |
| AdminPage.jsx | Login e formulário de materiais. | App.jsx |
| AdminCourseManager.jsx | Formulário e lista de disciplinas. | AdminPage.jsx |
| portalApi.js | Comunicação com banco e Storage. | Páginas administrativas e públicas |
| supabase.js | Cria cliente de conexão. | portalApi.js e AdminPage.jsx |
| styles.css | Visual do portal. | main.jsx |

## Banco de dados

O Supabase usa PostgreSQL. O portal utiliza três tabelas principais.

### courses

Representa uma disciplina.

| Campo | Significado |
|---|---|
| id | Identificador interno único. |
| slug | Nome técnico único derivado do título. |
| title | Nome mostrado no site. |
| code | Código da disciplina. |
| workload | Carga horária ou informação complementar. |
| institution | Instituição mostrada no cabeçalho. |
| teacher | Docente responsável. |
| description | Curso, turma ou período. |
| status | Disponível ou Em preparação. |
| position | Ordem no catálogo. |
| created_at e updated_at | Datas técnicas. |

### materials

Representa um card/material.

| Campo | Significado |
|---|---|
| id | Identificador interno único. |
| course_id | Disciplina à qual pertence. |
| title | Título do card. |
| summary | Resumo apresentado ao estudante. |
| area | Tema do material. |
| note | Observação complementar. |
| material_url | Link externo ou URL pública do PDF. |
| storage_path | Caminho interno do PDF no Storage. |
| status | draft ou published. |
| position | Número e ordem do material. |
| published_at | Data de publicação. |
| created_by | Administrador que criou o registro. |
| created_at e updated_at | Datas técnicas. |

### admin_users

Representa quem possui permissão administrativa.

| Campo | Significado |
|---|---|
| user_id | Identificador do usuário do Supabase Auth. |
| role | Atualmente, admin. |
| created_at | Data do vínculo administrativo. |

A tabela auth.users é administrada pelo Supabase e não deve ser editada manualmente.

## Segurança

As políticas no Supabase são a segurança real do portal.

- Visitantes podem ler disciplinas e materiais com status published.
- Rascunhos não são devolvidos na consulta pública.
- Somente contas autenticadas presentes em admin_users podem criar, editar ou excluir disciplinas e materiais.
- Somente administradores podem enviar, trocar ou remover PDFs.
- A senha do banco e a chave service_role nunca podem aparecer no navegador, no GitHub ou no Render.

Variáveis com prefixo VITE_ chegam ao navegador. Elas não são segredos; a proteção depende das políticas RLS configuradas no Supabase.

## PDFs

Os PDFs ficam no bucket público chamado course-materials.

O bucket é público porque os alunos precisam abrir os materiais. Mesmo assim, somente administradores possuem autorização para enviar, alterar ou apagar arquivos.

No formulário administrativo, é possível informar um link externo ou escolher um PDF. Se um PDF for enviado, ele substitui o link manual. Ao substituir um PDF, o sistema remove o arquivo anterior. Ao excluir um material, o sistema tenta remover o PDF correspondente.

## Como usar o painel administrativo

1. Acesse /admin.
2. Entre com a conta criada em Supabase Authentication.
3. Para cadastrar uma disciplina, use a seção Cadastrar disciplina.
4. Para cadastrar um material:
   - escolha a disciplina;
   - preencha título, resumo, área e observação;
   - informe um link ou envie um PDF;
   - escolha Rascunho ou Publicado;
   - salve.
5. Use Editar para alterar qualquer informação.
6. Use Excluir para apagar um registro.

Atenção: excluir uma disciplina também exclui todos os materiais vinculados a ela.

## Configurar o projeto em outro computador

### Instalar dependências

É necessário ter Node.js 22 ou compatível.

    npm install

### Criar configuração local

    cp .env.example .env.local

Preencha .env.local com os dados do projeto Supabase:

    VITE_SUPABASE_URL=https://seu-projeto.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publicavel

Os valores ficam em Supabase, em Project Settings e API Keys. Não envie .env.local ao GitHub.

### Executar localmente

    npm run dev

O terminal costuma exibir http://localhost:5173.

### Compilar para produção

    npm run build

Esse comando cria ou atualiza a pasta dist. Não edite essa pasta manualmente.

### Executar os testes matemáticos

    npm test

Os testes cobrem o interpretador de funções, as validações, os principais critérios de parada dos três métodos e a detecção de divergência do ponto fixo.

### Pré-visualizar a versão compilada

    npm run start

## Configuração inicial do Supabase

Para recriar a infraestrutura do zero:

1. crie um projeto Supabase;
2. crie as tabelas courses, materials e admin_users;
3. ative RLS nas tabelas;
4. crie políticas de leitura pública e escrita somente para administradores;
5. crie o usuário docente em Authentication e registre seu user_id em admin_users;
6. crie o bucket público course-materials;
7. crie as políticas de Storage para administradores;
8. adicione a coluna storage_path em materials;
9. execute o arquivo [02_seed_calculo_numerico.sql](./supabase/02_seed_calculo_numerico.sql) uma única vez, se desejar importar os materiais iniciais.

O arquivo de seed insere 37 materiais de Cálculo Numérico: os três primeiros como publicados e os demais como rascunhos. Não execute duas vezes, pois materiais duplicados serão criados.

## Publicação no Render

O site é publicado diretamente pelo serviço `blogdovinicius` no Render, conectado à branch `main` deste repositório. A URL pública é https://blogdovinicius.onrender.com.

No painel do serviço, mantenha esta configuração:

1. tipo: Static Site;
2. build command: `npm ci && npm run build`;
3. publish directory: `dist`;
4. variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`;
5. rewrite de `/*` para `/index.html`, para que `/admin` abra diretamente.

Cada envio para a branch `main` dispara um novo deploy. Depois da publicação, teste `/` e `/admin` no endereço público.

## Limites atuais e próximos passos

O portal já possui o ciclo essencial de publicação. Melhorias possíveis:

- recuperação de senha;
- mais de um administrador, com diferentes papéis;
- reordenação visual de disciplinas e materiais;
- páginas próprias de leitura;
- indicadores de acesso ou progresso;
- histórico de alterações;
- domínio próprio;
- testes automatizados.

## Resumo

React monta as telas. Supabase guarda e protege dados, login e PDFs. Render publica o site. Estudantes acessam apenas materiais publicados, e o docente administra o conteúdo em /admin.
