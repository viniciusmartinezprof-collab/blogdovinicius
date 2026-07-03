function Header() {
  return (
    <header className="site-header">
      <div>
        <p className="eyebrow">Primeiro blog em React - FCB Mentorship </p>
        <h1> Aprendizdo 2026 </h1>
        <p className="hero-text">
          Um espaco para praticar React, registrar estudos.
            </p>
      </div>

      <nav className="main-nav" aria-label="Navegacao principal">
        <a href="#posts">Posts</a>
        <a href="#aprendizados">Aprendizados</a>
        <a href="#sobre">Sobre</a>
      </nav>
    </header>
  );
}

export default Header;
