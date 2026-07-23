import { useState } from "react";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import PostCard from "./components/PostCard.jsx";
import { posts, publishedPostCount } from "./data/lessons.js";

function App() {
  // Forma simples de ler esta linha:
  // "Crie um estado chamado search para guardar o texto da busca."
  const [search, setSearch] = useState("");

  // Forma simples de ler este bloco:
  // "Transforme os textos brutos em publicações prontas para a tela."
  const blogPosts = posts.map((post, index) => {
    const postNumber = index + 1;
    const isPublished = postNumber <= publishedPostCount;
    const isNewestPublished = isPublished && postNumber === publishedPostCount;

    return {
      id: postNumber,
      area: post.area,
      isPublished,
      isNewestPublished,
      postLabel: `Publicação ${String(postNumber).padStart(2, "0")}`,
      statusLabel: isPublished ? "Publicado" : "Rascunho",
      availabilityLabel: post.postUrl ? "Leitura disponível" : "Em preparação",
      title: post.title,
      description: post.summary,
      note: post.note,
      postUrl: post.postUrl || "",
    };
  });

  // "Pegue apenas as publicações prontas que combinam com a busca."
  const publishedPosts = blogPosts
    .filter((post) => post.isPublished)
    .filter((post) => {
      const normalizedSearch = search.toLowerCase();

      return (
        post.title.toLowerCase().includes(normalizedSearch) ||
        post.description.toLowerCase().includes(normalizedSearch) ||
        post.postLabel.toLowerCase().includes(normalizedSearch) ||
        post.area.toLowerCase().includes(normalizedSearch)
      );
    })
    .sort((firstPost, secondPost) => secondPost.id - firstPost.id);
  return (
    <div className="page-shell">
      <Header search={search} onSearchChange={setSearch} />

      <main className="section-stack">
        <section className="posts-section" id="publicacoes">
          <div className="lesson-section">
            <div className="section-heading">
              <h3>Publicações recentes</h3>
              <p>
                As publicações mais recentes aparecem primeiro. Abra um card
                para ler o conteúdo, quando ele estiver disponível.
              </p>
            </div>

            <div className="posts-grid">
              {publishedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
