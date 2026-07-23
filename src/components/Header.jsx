function Header({ search, onSearchChange }) {
  return (
    <header className="site-header">
      <div>
        <p className="eyebrow">
          Vinícius Machado Martinez · notas e aprendizados
        </p>
        <h1>Blog pessoal</h1>
        <p className="hero-text">
          Um espaço para registrar ideias, estudos e materiais que valem a pena
          guardar e compartilhar.
        </p>
      </div>    
      <nav className="main-nav" aria-label="Navegação principal">
        <a href="#publicacoes">Publicações</a>
      </nav>

      <label className="header-search" htmlFor="search-posts">
        Pesquise por publicação, assunto ou área:
        <input
          id="search-posts"
          type="text"
          placeholder="Ex.: ponto flutuante, estudo, fundamentos..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
    </header>
  );
}

export default Header;
