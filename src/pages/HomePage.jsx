import { ArrowUpRight, BookOpen, Orbit } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import MathRibbon from "../components/MathRibbon.jsx";

const portalAreas = [
  {
    to: "/disciplinas",
    eyebrow: "Ensino",
    title: "Disciplinas ministradas",
    description:
      "Acesse materiais de estudo, listas, orientações e conteúdos organizados por disciplina.",
    action: "Ver disciplinas",
    Icon: BookOpen,
    modifier: "is-courses",
  },
  {
    to: "/espaco-poincare",
    eyebrow: "Matemática em movimento",
    title: "Espaço Poincaré",
    description:
      "Explore simuladores e ferramentas interativas para experimentar conceitos matemáticos passo a passo.",
    action: "Explorar o espaço",
    Icon: Orbit,
    modifier: "is-poincare",
  },
];

function HomePage() {
  return (
    <div className="page-shell portal-landing-page">
      <main className="portal-landing-main">
        <header className="portal-landing-hero">
          <MathRibbon className="portal-landing-ribbon" />
          <p className="portal-landing-eyebrow">
            IFPR campus Ivaiporã · Prof. Dr. Vinícius Machado Martinez
          </p>
          <h1 className="portal-landing-title">
            VMM <em>Space</em>
          </h1>
          <p className="portal-landing-lead">
            Um espaço para aprender, investigar e enxergar a matemática por
            diferentes perspectivas.
          </p>
        </header>

        <section
          className="portal-landing-areas"
          aria-labelledby="portal-landing-areas-title"
        >
          <div className="portal-landing-section-heading">
            <p className="portal-landing-section-kicker">Escolha seu caminho</p>
            <h2 id="portal-landing-areas-title">Por onde vamos começar?</h2>
          </div>

          <div className="portal-landing-grid">
            {portalAreas.map(
              ({ to, eyebrow, title, description, action, Icon, modifier }) => (
                <Link
                  className={`portal-landing-card ${modifier}`}
                  to={to}
                  key={to}
                  aria-label={`${action}: ${title}`}
                >
                  <span className="portal-landing-card-icon" aria-hidden="true">
                    <Icon size={30} strokeWidth={1.7} />
                  </span>

                  <div className="portal-landing-card-copy">
                    <span className="portal-landing-card-eyebrow">{eyebrow}</span>
                    <h3 className="portal-landing-card-title">{title}</h3>
                    <p className="portal-landing-card-description">
                      {description}
                    </p>
                  </div>

                  <span className="portal-landing-card-action" aria-hidden="true">
                    {action}
                    <ArrowUpRight size={19} strokeWidth={1.8} />
                  </span>
                </Link>
              ),
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default HomePage;
