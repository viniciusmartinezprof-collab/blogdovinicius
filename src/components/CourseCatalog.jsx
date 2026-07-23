import MathRibbon from "./MathRibbon.jsx";

function CourseCatalog({ courses, onSelectCourse }) {
  return (
    <main className="course-catalog" aria-labelledby="catalog-title">
      <header className="catalog-header">
        <MathRibbon />
        <p className="eyebrow">IFPR campus Ivaiporã - Prof. Dr. Vinícius Machado Martinez  </p>
        <h2 id="catalog-title">Disciplinas ministradas </h2>
        <p>
          Selecione uma disciplina para acessar materiais de estudo, listas e
          orientações do curso.
        </p>
      </header>

      <section className="course-grid" aria-label="Disciplinas disponíveis">
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
      </section>
    </main>
  );
}

export default CourseCatalog;
