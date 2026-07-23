function Header({ course, search, onSearchChange, onBackToCourses }) {
  return (
    <header className="site-header">
      <div>
        <p className="eyebrow">{course.institution}</p>
        <p className="course-code">{course.code} · {course.workload}</p>
        <h1>{course.title}</h1>
        <p className="hero-text">{course.description}</p>
        <p className="course-signature">{course.teacher}</p>
      </div>
      <nav className="main-nav" aria-label="Navegação principal">
        <button className="course-switcher" type="button" onClick={onBackToCourses}>
          ← Disciplinas
        </button>
        <a href="#publicacoes">Materiais</a>
      </nav>

      <label className="header-search" htmlFor="search-posts">
        Pesquise por material, assunto ou área:
        <input
          id="search-posts"
          type="text"
          placeholder="Ex.: ponto flutuante, bisseção, fundamentos..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
    </header>
  );
}

export default Header;
