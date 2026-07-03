import { useState } from "react";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import LessonCard from "./components/LessonCard.jsx";
import { lessons, releasedModuleCount } from "./data/lessons.js";

function App() {
  // Forma simples de ler esta linha:
  // "Crie um estado chamado search para guardar o texto da busca."
  const [search, setSearch] = useState("");

  // Forma simples de ler este bloco:
  // "Transforme os dados brutos em objetos prontos para a tela."
  const courseLessons = lessons.map((lesson, index) => {
    const lessonNumber = index + 1;
    const isReleased = lessonNumber <= releasedModuleCount;
    const isNewestReleased = isReleased && lessonNumber === releasedModuleCount;

    return {
      id: lessonNumber,
      area: lesson.area,
      isReleased,
      isNewestReleased,
      moduleLabel: `Módulo ${String(lessonNumber).padStart(2, "0")}`,
      statusLabel: isReleased ? "Liberado" : "Bloqueado",
      availabilityLabel: lesson.exerciseListUrl
        ? "Lista disponível"
        : "Lista em breve",
      publicTitle: lesson.title,
      publicDescription: lesson.summary,
      teacherNote: lesson.note,
      exerciseListUrl: lesson.exerciseListUrl || "",
    };
  });

  // Forma simples de ler este bloco:
  // "Pegue apenas os módulos liberados que combinam com a busca."
  const releasedLessons = courseLessons
    .filter((lesson) => lesson.isReleased)
    .filter((lesson) => {
      const normalizedSearch = search.toLowerCase();

      return (
        lesson.publicTitle.toLowerCase().includes(normalizedSearch) ||
        lesson.publicDescription.toLowerCase().includes(normalizedSearch) ||
        lesson.moduleLabel.toLowerCase().includes(normalizedSearch) ||
        lesson.area.toLowerCase().includes(normalizedSearch)
      );
    })
    .sort((firstLesson, secondLesson) => secondLesson.id - firstLesson.id);
  return (
    <div className="page-shell">
      <Header search={search} onSearchChange={setSearch} />

      <main className="section-stack">
        <section className="posts-section" id="aulas">
          <h2>Trilha completa</h2>

          <div className="lesson-section">
            <div className="section-heading">
              <h3>Módulos liberados</h3>
              <p>
                Os módulos mais recentes aparecem primeiro. Clique em um card
                para abrir a lista de exercícios, quando ela estiver disponível.
              </p>
            </div>

            <div className="posts-grid">
              {releasedLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                />
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
