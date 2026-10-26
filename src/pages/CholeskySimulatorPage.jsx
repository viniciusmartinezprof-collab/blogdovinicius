import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import MathRibbon from '../components/MathRibbon.jsx';
import { formatNumber as f, parseSquareMatrix, quadraticForm, runCholesky, transpose } from '../lib/cholesky.js';

const EXAMPLES = [
  { label: '3×3 definida positiva', text: '4 12 -16\n12 37 -43\n-16 -43 98' },
  { label: '2×2 definida positiva', text: '4 2\n2 3' },
  { label: 'Não simétrica', text: '4 1\n2 3' },
  { label: 'Indefinida', text: '1 2\n2 1' },
  { label: 'Semidefinida', text: '1 1\n1 1' },
];

function Matrix({ label, values, step, transposed = false }) {
  return <section className="lu-matrix-block" aria-label={`Matriz ${label}`}>
    <div className="lu-matrix-label">{label}</div>
    <div className="lu-matrix cholesky-matrix" style={{ '--lu-columns': values.length }}>
      {values.flatMap((row, i) => row.map((value, j) => <div key={`${i}-${j}`} className={`lu-cell ${step && (transposed ? j === step.row && i === step.column : i === step.row && j === step.column) ? 'is-pivot' : ''}`}>{f(value)}</div>))}
    </div>
  </section>;
}

function VectorExperiment({ matrix, converged }) {
  const [text, setText] = useState(matrix.map(() => '1').join(' '));
  let result, error;
  try {
    const tokens = text.trim().split(/[\s;]+/);
    const vector = tokens.map((x) => /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(x) ? Number(x.replace(',', '.')) : NaN);
    result = quadraticForm(matrix, vector);
  } catch (e) { error = e.message; }
  return <div className="cholesky-vector">
    <label htmlFor="cholesky-vector">Vetor coluna v (componentes separadas por espaços)</label>
    <input id="cholesky-vector" value={text} onChange={(e) => setText(e.target.value)} aria-describedby="vector-result" aria-invalid={!!error} />
    <p id="vector-result" aria-live="polite">{error || `Av = (${result.av.map(f).join('; ')})ᵀ; vᵀAv = ${f(result.value)}${result.value <= 0 ? '. Este vetor não nulo refuta a definição positiva.' : '.'}`}</p>
    <p>Um resultado positivo para um vetor isolado não prova a condição para todos os vetores.</p>
    {converged && <p>Com A = GGᵀ e G invertível, vᵀAv = (Gᵀv)ᵀ(Gᵀv) = ‖Gᵀv‖² &gt; 0 para todo v ≠ 0.</p>}
  </div>;
}

export default function CholeskySimulatorPage() {
  const [matrixText, setMatrixText] = useState(EXAMPLES[0].text);
  const [tolerance, setTolerance] = useState('1e-10');
  const [run, setRun] = useState(() => runCholesky({ matrix: parseSquareMatrix(EXAMPLES[0].text) }));
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(650);
  const terminal = useRef(null);
  const last = run.steps.length - 1;
  const step = run.steps[index];
  useEffect(() => {
    if (!playing) return;
    if (index >= last) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setIndex((i) => i + 1), speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, last, speed]);
  useEffect(() => { terminal.current?.scrollTo({ top: terminal.current.scrollHeight }); }, [index]);
  function execute(text = matrixText, tau = tolerance) {
    setPlaying(false);
    try {
      const result = runCholesky({ matrix: parseSquareMatrix(text), tolerance: Number(tau.replace(',', '.')) });
      setRun(result); setIndex(0); setError('');
    } catch (e) { setError(e.message); }
  }
  function select(i) { setPlaying(false); setIndex(Math.max(0, Math.min(last, i))); }
  return <div className="page-shell bisection-page">
    <header className="poincare-simulator-header">
      <MathRibbon />
      <Link className="poincare-back-link" to="/espaco-poincare"><ArrowLeft size={16} /> Voltar ao Espaço Poincaré</Link>
      <div className="poincare-simulator-title">
        <p className="eyebrow">Espaço Poincaré · Simulador 08</p>
        <h1>Fatoração de <em>Cholesky</em></h1>
        <p>Verifique a simetria e a definição positiva de A, e construa o fator triangular inferior G, elemento por elemento.</p>
      </div>
      <div className="poincare-header-formula" aria-hidden="true"><span>A = GGᵀ</span><span>────────</span><span>A = Aᵀ · vᵀAv &gt; 0</span></div>
    </header>
    <main className="bisection-main">
      <section className="bisection-setup" aria-labelledby="parameters-title">
        <div className="bisection-section-heading"><span>01</span><div><p className="section-kicker">Prepare a matriz</p><h2 id="parameters-title">Coeficientes de A</h2></div></div>
        <form className="bisection-form gaussian-form" noValidate onSubmit={(e) => { e.preventDefault(); execute(); }}>
          <label className="gaussian-matrix-field" htmlFor="cholesky-input"><span>Matriz quadrada A</span>
            <textarea id="cholesky-input" value={matrixText} onChange={(e) => setMatrixText(e.target.value)} spellCheck="false" aria-describedby="matrix-help cholesky-error" />
            <small id="matrix-help">De 2×2 a 6×6. Uma linha por vez; separe os valores por espaços ou ponto e vírgula. Aceita vírgula decimal.</small>
          </label>
          <div className="bisection-form-grid gaussian-control-grid"><label htmlFor="cholesky-tolerance"><span>Tolerância relativa τ</span><input id="cholesky-tolerance" value={tolerance} onChange={(e) => setTolerance(e.target.value)} inputMode="decimal" /></label></div>
          <div className="bisection-examples"><span>Carregar exemplo:</span>{EXAMPLES.map((example) => <button type="button" key={example.label} onClick={() => { setMatrixText(example.text); setTolerance('1e-10'); execute(example.text, '1e-10'); }}>{example.label}</button>)}</div>
          <p id="cholesky-error" className={error ? 'bisection-form-error' : 'bisection-form-note'} role={error ? 'alert' : undefined}>{error || 'A simetria é verificada nos valores digitados. A tolerância controla a certificação numérica da positividade.'}</p>
          <button type="submit" className="bisection-run-button"><Sparkles size={17} /> Executar fatoração</button>
        </form>
      </section>

      <section className="bisection-results" aria-labelledby="criteria-title">
        <div className="bisection-section-heading"><span>02</span><div><p className="section-kicker">Condições de aplicação</p><h2 id="criteria-title">Simetria e definição positiva</h2></div></div>
        <p className={`bisection-conclusion ${run.symmetric ? '' : 'is-warning'}`}>{run.symmetric ? 'A = Aᵀ: a matriz é simétrica.' : 'A ≠ Aᵀ: a matriz não é simétrica. Cholesky não se aplica.'}</p>
        <p>Para uma matriz real simétrica, os três critérios abaixo são equivalentes.</p>
        <div className="cholesky-criteria">
          <article><h3>1. Autovalores positivos</h3><p>λᵢ &gt; 0 para todo i.</p>
            {run.eigenvalues ? <ul>{run.eigenvalues.map((value, i) => <li key={i}>λ<sub>{i + 1}</sub> ≈ {f(value)}</li>)}</ul> : <p>Critério não aplicado: A não é simétrica.</p>}
            <p>Valores aproximados. Exigimos λ mínimo / max |aᵢⱼ| &gt; τ; valores próximos de zero são inconclusivos nessa precisão.</p>
          </article>
          <article><h3>2. Menores principais positivos</h3><p>Critério de Sylvester: basta verificar os menores principais líderes Δₖ = det(A₁:ₖ,₁:ₖ), formados pelas primeiras k linhas e colunas.</p>
            <ul>{run.minors.map((value, i) => <li key={i}>Δ<sub>{i + 1}</sub> ≈ {f(value)}</li>)}</ul>
            <p>Para A simétrica, Δ₁ &gt; 0, …, Δₙ &gt; 0 equivale à definição positiva. Isso também implica que todos os demais menores principais são positivos.</p>
          </article>
          <article><h3>3. Forma quadrática positiva</h3><p>vᵀAv &gt; 0 para todo vetor coluna v ≠ 0.</p><VectorExperiment key={JSON.stringify(run.matrix)} matrix={run.matrix} converged={run.converged} /></article>
        </div>
        <p className={`bisection-conclusion ${run.converged ? '' : 'is-warning'}`} role="status">{run.converged ? 'A é simétrica e definida positiva na precisão escolhida. Podemos aplicar Cholesky.' : run.reason}</p>
      </section>

      <section className="bisection-results" aria-labelledby="simulation-title">
        <div className="bisection-section-heading"><span>03</span><div><p className="section-kicker">Construção dos fatores</p><h2 id="simulation-title">A = G · Gᵀ, passo a passo</h2></div></div>
        <div className="bisection-playback">
          <div className="bisection-controls" aria-label="Controles da simulação">
            <button type="button" onClick={() => select(0)} disabled={index === 0} aria-label="Reiniciar"><RotateCcw size={17} /></button>
            <button type="button" onClick={() => select(index - 1)} disabled={index === 0}><ChevronLeft size={18} /> Anterior</button>
            <button type="button" className="is-primary" aria-pressed={playing} onClick={() => { if (index === last) setIndex(0); setPlaying(!playing); }}>{playing ? <Pause size={18} /> : <Play size={18} />}{playing ? 'Pausar' : 'Reproduzir'}</button>
            <button type="button" onClick={() => select(index + 1)} disabled={index === last}>Próxima <ChevronRight size={18} /></button>
          </div>
          <label className="bisection-timeline">Passo {index} de {last}<input type="range" min="0" max={last} value={index} onChange={(e) => select(Number(e.target.value))} style={{ '--timeline-progress': `${index / last * 100}%` }} /></label>
          <label className="bisection-speed">Velocidade<select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{[[1100, '0,5×'], [650, '1×'], [300, '2×'], [150, '4×']].map(([delay, label]) => <option key={delay} value={delay}>{label}</option>)}</select></label>
        </div>
        <div className="bisection-workspace">
          <div className="bisection-visual-panel"><div className="bisection-panel-label"><span>{step.title}</span></div>
            <div className="lu-stage cholesky-stage"><Matrix label="A" values={run.matrix} /><p>{step.type === 'done' ? 'A = G · Gᵀ' : 'Fatores em construção (zeros ainda não calculados abaixo da diagonal)'}</p><div className="lu-equation"><Matrix label="G" values={step.lower} step={step} /><span className="lu-symbol">·</span><Matrix label="Gᵀ" values={transpose(step.lower)} step={step} transposed /></div></div>
          </div>
          <section className="iteration-terminal" aria-label="Console da fatoração de Cholesky"><div className="iteration-terminal-header"><span className="iteration-terminal-title">cholesky/fatoracao.log</span></div><div className="iteration-terminal-body" ref={terminal}>{run.steps.slice(0, index + 1).map((item, i) => <div key={i}><p className={`iteration-terminal-line ${i === index ? 'is-decision' : 'is-muted'}`}>[{i}] {item.title}</p><p className="iteration-terminal-line">{item.description}</p></div>)}</div></section>
        </div>
        {index === last && <p className={`bisection-conclusion ${run.converged ? '' : 'is-warning'}`}>{run.converged ? `A ≈ GGᵀ. Resíduo relativo máximo: ${f(run.residual)}.` : run.reason}</p>}
        {index === last && run.converged && <div className="lu-equation"><Matrix label="GGᵀ (reconstrução)" values={run.product} /></div>}
        <details className="bisection-table-panel"><summary>Consultar roteiro completo ({run.steps.length} passos)</summary><div className="bisection-table-scroll"><table><thead><tr><th>Passo</th><th>Etapa</th><th>Cálculo</th></tr></thead><tbody>{run.steps.map((item, i) => <tr key={i} className={i === index ? 'is-active' : ''}><th><button type="button" onClick={() => select(i)} aria-label={`Ver passo ${i}`}>{i}</button></th><td>{item.title}</td><td>{item.description}</td></tr>)}</tbody></table></div></details>
      </section>
      <aside className="bisection-method-note"><span aria-hidden="true">i</span><div><h2>Como calculamos G?</h2><p>Na diagonal: gⱼⱼ = √(aⱼⱼ − Σₖ₌₁ʲ⁻¹ gⱼₖ²). Abaixo dela: gᵢⱼ = (aᵢⱼ − Σₖ₌₁ʲ⁻¹ gᵢₖgⱼₖ) / gⱼⱼ, para i &gt; j. A soma vazia vale zero. Escolhemos a raiz positiva; assim, G é único. Gᵀ é a transposta de G.</p></div></aside>
    </main><Footer />
  </div>;
}
