import MathRibbon from "./MathRibbon.jsx";

function CourseCatalog({ courses, isLoading = false, errorMessage = "", onSelectCourse }) {
  return (
    <section className="course-catalog" aria-labelledby="catalog-title">
      <header className="catalog-header">
        <MathRibbon />
        <p className="eyebrow">IFPR campus Ivaiporã · Prof. Dr. Vinícius Machado Martinez</p>
        <h1 id="catalog-title">Disciplinas ministradas</h1>
        <p>
          Selecione uma disciplina para acessar materiais de estudo, listas e
          orientações do curso.
        </p>
      </header>

      {isLoading ? (
        <div className="catalog-inline-state" role="status">
          <span aria-hidden="true">∫</span>
          <p>Carregando disciplinas…</p>
        </div>
      ) : errorMessage ? (
        <div className="catalog-inline-state is-error" role="alert">
          <span aria-hidden="true">!</span>
          <div>
            <strong>As disciplinas não puderam ser carregadas.</strong>
            <p>Atualize a página em alguns instantes.</p>
          </div>
        </div>
      ) : (
        <div className="course-grid" aria-label="Disciplinas disponíveis">
          {courses.map((course) => {
            const isAvailable = course.status === "Disponível";

            return (
              <article className="course-card" key={course.id}>
                <div className="course-card-top">
                  <span>{course.code}</span>
                  <span className={isAvailable ? "course-status is-available" : "course-status"}>
                    {course.status}
                  </span>
                </div>
                <h2>{course.title}</h2>
                <p>{course.description}</p>
                <p className="course-teacher">{course.teacher}</p>
                <button type="button" onClick={() => onSelectCourse(course.id)}>
                  {isAvailable ? "Acessar disciplina" : "Conhecer disciplina"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CourseCatalog;
