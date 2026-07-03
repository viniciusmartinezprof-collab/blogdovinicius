function Header({ search, onSearchChange }) {
  return (
    <header className="site-header">
      <div>
        <p className="eyebrow">
          Prof. Dr. Vinícius Machado Martinez - Lic. Física - 2026.2
        </p>
        <h1>Cálculo Numérico (67h)</h1>
        <p className="hero-text">
          Página de apoio para acesso direto às listas de exercícios liberadas
          em cada módulo do curso.
        </p>
      </div>    
      <nav className="main-nav" aria-label="Navegação principal">
        <a href="#aulas">Módulos</a>
      </nav>

      <label className="header-search" htmlFor="search-posts">
        Pesquise por módulo, assunto ou área:
        <input
          id="search-posts"
          type="text"
          placeholder="Ex.: Módulo 03, bisseção, ponto flutuante..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
    </header>
  );
}

export default Header;
