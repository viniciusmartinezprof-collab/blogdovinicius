import { useEffect, useState } from "react";
import CourseCatalog from "../components/CourseCatalog.jsx";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import PostCard from "../components/PostCard.jsx";
import { fetchCourses, fetchPublishedMaterials } from "../data/portalApi.js";

function PublicPortal() {
  const [courses, setCourses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

  useEffect(() => {
    async function loadCourses() {
      try {
        setErrorMessage("");
        setIsLoadingCourses(true);
        setCourses(await fetchCourses());
      } catch (error) {
        setErrorMessage("Não foi possível carregar as disciplinas. Tente novamente mais tarde.");
        console.error(error);
      } finally {
        setIsLoadingCourses(false);
      }
    }

    loadCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setMaterials([]);
      return;
    }

    async function loadMaterials() {
      try {
        setErrorMessage("");
        setIsLoadingMaterials(true);
        setMaterials(await fetchPublishedMaterials(selectedCourseId));
      } catch (error) {
        setErrorMessage("Não foi possível carregar os materiais. Tente novamente mais tarde.");
        console.error(error);
      } finally {
        setIsLoadingMaterials(false);
      }
    }

    loadMaterials();
  }, [selectedCourseId]);

  if (isLoadingCourses) {
    return <PortalState title="Carregando disciplinas…" />;
  }

  if (errorMessage && !selectedCourse) {
    return <PortalState title={errorMessage} isError />;
  }

  if (!selectedCourse) {
    return (
      <div className="page-shell">
        <CourseCatalog courses={courses} onSelectCourse={setSelectedCourseId} />
        <Footer />
      </div>
    );
  }

  const visibleMaterials = materials
    .map((material, index) => ({
      id: material.id,
      area: material.area,
      isPublished: material.status === "published",
      isNewestPublished: index === 0,
      materialLabel: `Material ${String(material.position).padStart(2, "0")}`,
      statusLabel: "Publicado",
      availabilityLabel: material.material_url ? "Acesso disponível" : "Em preparação",
      title: material.title,
      description: material.summary,
      note: material.note,
      postUrl: material.material_url || "",
    }))
    .filter((material) => {
      const normalizedSearch = search.toLowerCase();

      return (
        material.title.toLowerCase().includes(normalizedSearch) ||
        material.description.toLowerCase().includes(normalizedSearch) ||
        material.materialLabel.toLowerCase().includes(normalizedSearch) ||
        material.area.toLowerCase().includes(normalizedSearch)
      );
    });

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
              <p>Os materiais mais recentes aparecem primeiro. Abra um card para acessar o conteúdo, quando ele estiver disponível.</p>
            </div>

            {errorMessage ? <p className="portal-inline-error">{errorMessage}</p> : null}

            {isLoadingMaterials ? (
              <div className="empty-materials"><span>∫</span><h4>Carregando materiais…</h4></div>
            ) : visibleMaterials.length > 0 ? (
              <div className="posts-grid">
                {visibleMaterials.map((material) => <PostCard key={material.id} post={material} />)}
              </div>
            ) : (
              <div className="empty-materials">
                <span>∫</span>
                <h4>Materiais em preparação</h4>
                <p>Este espaço já está reservado para {selectedCourse.title}. Os primeiros materiais serão publicados em breve.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export function PortalState({ title, isError = false }) {
  return (
    <div className="page-shell portal-state">
      <span>{isError ? "!" : "∫"}</span>
      <h1>{title}</h1>
      {isError ? <p>Confira a conexão e tente atualizar a página.</p> : null}
    </div>
  );
}

export default PublicPortal;
