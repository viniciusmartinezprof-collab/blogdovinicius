# Portal de Disciplinas

Portal acadêmico para disponibilizar materiais de disciplinas, com uma área pública para estudantes e uma área administrativa protegida para o docente.

O projeto está em produção como um site estático React hospedado no Render. Os conteúdos, usuários e PDFs ficam no Supabase.

## O que o portal faz hoje

Para estudantes:

- exibe um catálogo de disciplinas;
- mostra somente materiais publicados;
- permite buscar materiais por título, resumo, área ou número;
- abre links externos e PDFs em outra aba;
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
    Estudante → área pública → React consulta Supabase → vê itens publicados

## Tecnologias

| Tecnologia | Explicação simples | Uso no portal |
|---|---|---|
| HTML | Estrutura da página web. | index.html é a porta de entrada. |
| CSS | Regras de aparência. | Define identidade acadêmica e celular. |
| JavaScript | Linguagem de comportamento. | Busca, formulários, login e banco. |
| React | Biblioteca de telas reutilizáveis. | Monta catálogo, cards e administração. |
| React Router | Navegação sem recarregar. | Define / e /admin. |
| Vite | Ferramenta de desenvolvimento. | Executa e compila o projeto. |
| Supabase | Backend pronto para uso. | Banco, autenticação, regras e PDFs. |
| PostgreSQL | Banco relacional. | Guarda disciplinas e materiais. |
| Supabase Storage | Armazenamento de arquivos. | Guarda PDFs. |
| Render | Hospedagem. | Publica o site. |
| npm | Gerenciador de pacotes. | Instala e executa comandos. |

## Rotas

| Endereço | Público | Finalidade |
|---|---:|---|
| / | Sim | Catálogo de disciplinas e materiais liberados. |
| /admin | Não | Login e painel administrativo. |

A rota /admin aparece no navegador, mas a proteção não depende apenas de escondê-la. O Supabase verifica se a conta autenticada é administradora antes de aceitar alterações.

## Como as partes se conectam

    Navegador
      → index.html
      → src/main.jsx inicia React e BrowserRouter
      → src/App.jsx escolhe a rota
           → /      abre pages/PublicPortal.jsx
           → /admin abre pages/AdminPage.jsx

Na área pública, PublicPortal busca disciplinas e materiais publicados. Na área administrativa, AdminPage verifica login e permissão antes de abrir os formulários.

## Estrutura de arquivos

    .
    ├── .env.example                    modelo das variáveis locais
    ├── .gitignore                      protege arquivos locais com chaves
    ├── index.html                       página inicial do navegador
    ├── package.json                     dependências e comandos
    ├── render.yaml                      configuração do Render
    ├── vite.config.ts                   configuração do Vite
    ├── src/
    │   ├── main.jsx                     inicia React e BrowserRouter
    │   ├── App.jsx                      declara as rotas / e /admin
    │   ├── styles.css                   aparência pública e administrativa
    │   ├── lib/
    │   │   └── supabase.js              cria a conexão com Supabase
    │   ├── data/
    │   │   ├── portalApi.js             lê, grava, atualiza e envia arquivos
    │   │   ├── courses.js               arquivo legado, não usado hoje
    │   │   └── lessons.js               referência do conteúdo anterior
    │   ├── pages/
    │   │   ├── PublicPortal.jsx         área pública
    │   │   └── AdminPage.jsx            login e administração de materiais
    │   └── components/
    │       ├── CourseCatalog.jsx        catálogo inicial
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
| PublicPortal.jsx | Catálogo, busca e cards públicos. | App.jsx |
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

O arquivo [render.yaml](./render.yaml) prepara um site estático no Render.

Ele executa npm ci seguido de npm run build, publica a pasta dist e faz uma reescrita de todas as rotas para index.html. Essa reescrita é necessária para que /admin funcione mesmo quando a pessoa abre esse endereço diretamente.

Passos:

1. envie alterações para a branch main no GitHub;
2. crie ou sincronize o Blueprint no Render;
3. informe VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY;
4. aguarde o deploy;
5. teste / e /admin.

O nome do Blueprint, o nome do repositório e a URL do serviço podem ser diferentes. A URL onrender.com é definida pelo nome do serviço estático no Render.

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
