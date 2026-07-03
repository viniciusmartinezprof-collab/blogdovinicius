import { useState } from "react";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import PostCard from "./components/PostCard.jsx";
import { posts } from "./data/posts.js";

function App() {
  // Forma simples de ler esta linha:
  // "Crie um estado chamado search, comece com texto vazio,
  // e me devolva uma funcao chamada setSearch para alterar esse valor."
  const [search, setSearch] = useState("");

  // Forma simples de ler este bloco:
  // "Pegue todos os posts e monte uma nova lista so com os que
  // combinam com o que foi digitado na busca."
  const filteredPosts = posts.filter((post) => {
    // Forma simples de ler esta linha:
    // "Transforme o texto da busca em minusculas para facilitar a comparacao."
    const normalizedSearch = search.toLowerCase();

    // Forma simples de ler este return:
    // "Deixe o post passar se a busca aparecer no titulo,
    // na categoria ou no trecho do texto."
    return (
      post.title.toLowerCase().includes(normalizedSearch) ||
      post.category.toLowerCase().includes(normalizedSearch) ||
      post.excerpt.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div className="page-shell">
      {/* Forma simples de ler esta linha:
          "Renderize o componente Header aqui no topo da pagina." */}
      <Header />

      <main className="section-stack">
        {/* Forma simples de ler esta section:
            "Mostre a area principal com introducao e campo de busca." */}
        <section className="feature-panel">
          <div>
            <p className="eyebrow">Primeira etapa</p>
            <h2>Um blog simples para aprender construindo</h2>
            <p>
              Nesta fase, os posts ainda estao em um arquivo local. Isso deixa
              o foco em React: componentes, estado e renderizacao dinamica.
            </p>
          </div>

          {/* Forma simples de ler este bloco:
              "Mostre um campo de busca ligado ao estado search." */}
          <label className="search-row" htmlFor="search-posts">
            Buscar posts por titulo, categoria ou trecho
            <input
              id="search-posts"
              type="text"
              placeholder="Ex.: React, estado, componentes..."
              // Forma simples de ler esta linha:
              // "O valor mostrado no input sera exatamente o valor de search."
              value={search}
              // Forma simples de ler esta linha:
              // "Quando a pessoa digitar algo, atualize search com esse novo texto."
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </section>

        {/* Forma simples de ler esta section:
            "Mostre a secao dos posts que sobraram depois do filtro." */}
        <section className="posts-section" id="posts">
          <h2>Posts de estudo</h2>
          <div className="posts-grid">
            {/* Forma simples de ler este bloco:
                "Passe pela lista filteredPosts e crie um PostCard para cada post." */}
            {filteredPosts.map((post) => (
              // Forma simples de ler esta linha:
              // "Renderize um card e envie o post atual para dentro dele."
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        {/* Forma simples de ler esta section:
            "Mostre uma lista do que este projeto ja esta ensinando." */}
        <section className="learning-panel" id="aprendizados">
          <h2>O que este codigo ja te deixa praticar</h2>
          <ol className="learning-list">
            <li>`useState` para controlar o campo de busca.</li>
            <li>`.map()` para renderizar uma lista de posts.</li>
            <li>`props` para enviar dados do `App` para `PostCard`.</li>
            <li>Separacao por responsabilidade em componentes pequenos.</li>
          </ol>
        </section>

        {/* Forma simples de ler esta section:
            "Mostre uma explicacao curta sobre a proposta do projeto." */}
        <section className="about-panel" id="sobre">
          <h2>Sobre o projeto</h2>
          <p>
            A ideia aqui nao e fazer tudo de uma vez. Vamos evoluir esse blog
            em camadas: primeiro layout e dados locais, depois rotas, depois
            pagina de post, e so mais adiante persistencia e backend.
          </p>
        </section>
      </main>

      {/* Forma simples de ler esta linha:
          "Renderize o rodape no final da pagina." */}
      <Footer />
    </div>
  );
}

export default App;
