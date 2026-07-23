import { useState } from "react";
import CourseCatalog from "./components/CourseCatalog.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import PostCard from "./components/PostCard.jsx";
import { courses } from "./data/courses.js";

function App() {
  const [search, setSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

  if (!selectedCourse) {
    return (
      <div className="page-shell">
        <CourseCatalog courses={courses} onSelectCourse={setSelectedCourseId} />
        <Footer />
      </div>
    );
  }

  const coursePosts = selectedCourse.materials.map((post, index) => {
    const materialNumber = index + 1;
    const isPublished = materialNumber <= selectedCourse.publishedMaterialCount;
    const isNewestPublished =
      isPublished && materialNumber === selectedCourse.publishedMaterialCount;

    return {
      id: materialNumber,
      area: post.area,
      isPublished,
      isNewestPublished,
      materialLabel: `Material ${String(materialNumber).padStart(2, "0")}`,
      statusLabel: isPublished ? "Publicado" : "Rascunho",
      availabilityLabel: post.postUrl ? "Acesso disponível" : "Em preparação",
      title: post.title,
      description: post.summary,
      note: post.note,
      postUrl: post.postUrl || "",
    };
  });

  const publishedPosts = coursePosts
    .filter((post) => post.isPublished)
    .filter((post) => {
      const normalizedSearch = search.toLowerCase();

      return (
        post.title.toLowerCase().includes(normalizedSearch) ||
        post.description.toLowerCase().includes(normalizedSearch) ||
        post.materialLabel.toLowerCase().includes(normalizedSearch) ||
        post.area.toLowerCase().includes(normalizedSearch)
      );
    })
    .sort((firstPost, secondPost) => secondPost.id - firstPost.id);

  return (
    <div className="page-shell">
      <Header
        course={selectedCourse}
        search={search}
        onSearchChange={setSearch}
        onBackToCourses={() => {
          setSearch("");
          setSelectedCourseId(null);
        }}
      />

      <main className="section-stack">
        <section className="posts-section" id="publicacoes">
          <div className="lesson-section">
            <div className="section-heading">
              <p className="section-kicker">Acervo da disciplina</p>
              <h3>Materiais liberados</h3>
              <p>
                Os materiais mais recentes aparecem primeiro. Abra um card
                para acessar o conteúdo, quando ele estiver disponível.
              </p>
            </div>

            {publishedPosts.length > 0 ? (
              <div className="posts-grid">
                {publishedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="empty-materials">
                <span>∫</span>
                <h4>Materiais em preparação</h4>
                <p>
                  Este espaço já está reservado para {selectedCourse.title}.
                  Os primeiros materiais serão publicados em breve.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
