import { useState } from "react";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import PostCard from "./components/PostCard.jsx";
import { posts } from "./data/posts.js";

function App() {
  // useState cria um "estado" do componente.
  // Neste caso, search guarda o texto digitado no campo de busca.
  // setSearch e a funcao usada para atualizar esse valor.
  const [search, setSearch] = useState("");

  // Aqui filtramos o array original de posts para mostrar so os que
  // combinam com o texto digitado pelo usuario.
  const filteredPosts = posts.filter((post) => {
    // Convertendo para minusculas, a busca funciona mesmo se o usuario
    // digitar "react", "React" ou "REACT".
    const normalizedSearch = search.toLowerCase();

    // includes() retorna true quando encontra o texto buscado.
    // Se qualquer uma das condicoes for true, o post permanece na lista.
    return (
      post.title.toLowerCase().includes(normalizedSearch) ||
      post.category.toLowerCase().includes(normalizedSearch) ||
      post.excerpt.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div className="page-shell">
      {/* Header e um componente separado.
          Isso ajuda a manter o App mais enxuto e organizado. */}
      <Header />

      <main className="section-stack">
        <section className="feature-panel">
          <div>
            <p className="eyebrow">Primeira etapa</p>
            <h2>Um blog simples para aprender construindo</h2>
            <p>
              Nesta fase, os posts ainda estao em um arquivo local. Isso deixa
              o foco em React: componentes, estado e renderizacao dinamica.
            </p>
          </div>

          {/* Este input e "controlado" pelo React:
              value mostra o valor atual do estado
              onChange atualiza o estado conforme o usuario digita
              Experimento: troque setSearch(event.target.value) por
              setSearch("react") e veja o que acontece. */}
          <label className="search-row" htmlFor="search-posts">
            Buscar posts por titulo, categoria ou trecho
            <input
              id="search-posts"
              type="text"
              placeholder="Ex.: React, estado, componentes..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </section>

        <section className="posts-section" id="posts">
          <h2>Posts de estudo</h2>
          <div className="posts-grid">
            {/* map() percorre o array e transforma cada objeto post
                em um componente PostCard na tela. */}
            {filteredPosts.map((post) => (
              // key ajuda o React a identificar cada item da lista.
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        <section className="learning-panel" id="aprendizados">
          <h2>O que este codigo ja te deixa praticar</h2>
          <ol className="learning-list">
            <li>`useState` para controlar o campo de busca.</li>
            <li>`.map()` para renderizar uma lista de posts.</li>
            <li>`props` para enviar dados do `App` para `PostCard`.</li>
            <li>Separacao por responsabilidade em componentes pequenos.</li>
          </ol>
        </section>

        <section className="about-panel" id="sobre">
          <h2>Sobre o projeto</h2>
          <p>
            A ideia aqui nao e fazer tudo de uma vez. Vamos evoluir esse blog
            em camadas: primeiro layout e dados locais, depois rotas, depois
            pagina de post, e so mais adiante persistencia e backend.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
