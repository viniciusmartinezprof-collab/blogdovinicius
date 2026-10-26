import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import MathRibbon from '../components/MathRibbon.jsx';
import { formatNumber as f, parseNumber, parseSquareMatrix, parseVector, runStationaryIteration } from '../lib/stationaryIteration.js';

const EXAMPLES = [
  { label: 'Diagonal dominante', matrix: '10 -1 2\n-1 11 -1\n2 -1 10', b: '6 22 -10', initial: '0 0 0' },
  { label: 'Converge sem dominância', matrix: '1 2\n0.1 1', b: '3 1.1', initial: '0 0' },
  { label: 'Jacobi diverge; Seidel converge', matrix: '1 0.6 0.6\n0.6 1 0.6\n0.6 0.6 1', b: '2.2 2.2 2.2', initial: '0 0 0' },
  { label: 'Dominância fraca · ρ = 1', matrix: '1 1\n-1 1', b: '2 0', initial: '0 0' },
  { label: 'Divergência', matrix: '1 2\n2 1', b: '3 3', initial: '0 0' },
  { label: 'Diagonal nula', matrix: '0 1\n1 2', b: '1 3', initial: '0 0' },
];
const DEFAULTS = { ...EXAMPLES[0], tolerance: '0.000001', maxIterations: '100' };
function execute(inputs, method) {
  const matrix = parseSquareMatrix(inputs.matrix);
  return runStationaryIteration({ matrix, method, b: parseVector(inputs.b, matrix.length, 'B'), initial: parseVector(inputs.initial, matrix.length, 'X⁽⁰⁾'), tolerance: parseNumber(inputs.tolerance, 'a tolerância'), maxIterations: parseNumber(inputs.maxIterations, 'o limite de iterações') });
}
function MatrixView({ label, values }) {
  return <section className="lu-matrix-block" aria-label={`Matriz ${label}`}><div className="lu-matrix-label">{label}</div><div className="lu-matrix cholesky-matrix" style={{ '--lu-columns': values[0].length }}>{values.flatMap((row, i) => row.map((x, j) => <div key={`${i}-${j}`} className="lu-cell">{f(x)}</div>))}</div></section>;
}
const column = (v) => v.map((x) => [x]);
function Heading({ number, kicker, title, id }) {
  return <div className="bisection-section-heading"><span>{number}</span><div><p className="section-kicker">{kicker}</p><h2 id={id}>{title}</h2></div></div>;
}
function ResidualPlot({ steps, index }) {
  const shown = steps.slice(0, index + 1);
  const logs = shown.map((s) => Math.log10(Math.max(s.residual, 1e-16)));
  if (!logs.every(Number.isFinite)) return null;
  const lo = Math.min(-6, ...logs), hi = Math.max(0, ...logs);
  const points = logs.map((v, i) => `${55 + i / Math.max(1, steps.length - 1) * 480},${25 + (hi - v) / (hi - lo) * 130}`);
  return <figure className="stationary-plot"><figcaption>Resíduo relativo por iteração (escala logarítmica)</figcaption><svg viewBox="0 0 580 190" role="img" aria-label={`Histórico do resíduo até a iteração ${index}`}><path d="M55 20V155H545" stroke="currentColor" fill="none" /><text x="4" y="30">10^{f(hi)}</text><text x="4" y="155">10^{f(lo)}</text><text x="55" y="180">0</text><text x="510" y="180">k = {steps.length - 1}</text><polyline points={points.join(' ')} fill="none" stroke="#68c9be" strokeWidth="2" />{points.map((point, i) => <circle key={i} cx={point.split(',')[0]} cy={point.split(',')[1]} r="2.5" fill="#edc466" />)}</svg><small>Valores menores que 10⁻¹⁶ são desenhados no piso 10⁻¹⁶.</small></figure>;
}

export default function StationaryIterationSimulatorPage({ method }) {
  const jacobi = method === 'jacobi';
  const name = jacobi ? 'Gauss-Jacobi' : 'Gauss-Seidel';
  const [inputs, setInputs] = useState(DEFAULTS);
  const [run, setRun] = useState(() => execute(DEFAULTS, method));
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(650);
  const terminal = useRef(null);
  const last = Math.max(0, run.steps.length - 1);
  const step = run.steps[index];
  const tFormula = jacobi ? 'T = −D⁻¹(L + U)' : 'T = −(D + L)⁻¹U';
  const cFormula = jacobi ? 'C = D⁻¹B' : 'C = (D + L)⁻¹B';
  useEffect(() => {
    if (!playing) return;
    if (index >= last) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setIndex((i) => i + 1), speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, last, speed]);
  useEffect(() => { terminal.current?.scrollTo({ top: terminal.current.scrollHeight }); }, [index]);
  function simulate(next = inputs) {
    setPlaying(false);
    try { setRun(execute(next, method)); setIndex(0); setError(''); } catch (e) { setError(e.message); }
  }
  function select(i) { setPlaying(false); setIndex(Math.max(0, Math.min(last, i))); }
  function update(field, value) { setInputs((old) => ({ ...old, [field]: value })); }
  return <div className="page-shell bisection-page">
    <header className="poincare-simulator-header"><MathRibbon /><Link className="poincare-back-link" to="/espaco-poincare"><ArrowLeft size={16} /> Voltar ao Espaço Poincaré</Link>
      <div className="poincare-simulator-title"><p className="eyebrow">Espaço Poincaré · Simulador {jacobi ? '09' : '10'}</p><h1>Método de <em>{name}</em></h1><p>{jacobi ? 'Atualize todas as componentes usando apenas os valores da iteração anterior.' : 'Atualize as componentes em sequência, usando imediatamente os novos valores.'} Explore a decomposição de A e os critérios de convergência.</p></div>
      <div className="poincare-header-formula" aria-hidden="true"><span>AX = B</span><span>A = D + L + U</span><span>X⁽ᵏ⁺¹⁾ = TX⁽ᵏ⁾ + C</span></div>
    </header>
    <main className="bisection-main">
      <section className="bisection-setup" aria-labelledby="parameters-title"><Heading number="01" kicker="Prepare o sistema" title="AX = B e chute inicial" id="parameters-title" />
        <form className="bisection-form gaussian-form" noValidate onSubmit={(e) => { e.preventDefault(); simulate(); }}>
          <label className="gaussian-matrix-field" htmlFor="iteration-matrix"><span>Matriz A</span><textarea id="iteration-matrix" value={inputs.matrix} onChange={(e) => update('matrix', e.target.value)} spellCheck="false" aria-describedby="matrix-help" /><small id="matrix-help">De 2×2 a 6×6, uma linha por vez. Separe valores por espaços ou ponto e vírgula. Aceita vírgula decimal.</small></label>
          <div className="bisection-form-grid gaussian-control-grid">{[['b', 'Vetor coluna B'], ['initial', 'Chute inicial X⁽⁰⁾'], ['tolerance', 'Tolerância ε'], ['maxIterations', 'Máximo de iterações (1–500)']].map(([key, label]) => <label key={key} htmlFor={`iteration-${key}`}><span>{label}</span><input id={`iteration-${key}`} value={inputs[key]} onChange={(e) => update(key, e.target.value)} aria-describedby="iteration-error" /></label>)}</div>
          <div className="bisection-examples"><span>Carregar exemplo:</span>{EXAMPLES.map((example) => <button type="button" key={example.label} onClick={() => { const next = { ...DEFAULTS, ...example }; setInputs(next); simulate(next); }}>{example.label}</button>)}</div>
          <p id="iteration-error" className={error ? 'bisection-form-error' : 'bisection-form-note'} role={error ? 'alert' : undefined}>{error || 'Informe as componentes de B e X⁽⁰⁾ separadas por espaços. A ordem das equações é preservada.'}</p>
          <button type="submit" className="bisection-run-button"><Sparkles size={17} /> Executar simulação</button>
        </form>
      </section>
      <section className="bisection-results" aria-labelledby="decomposition-title"><Heading number="02" kicker="Separação dos coeficientes" title="A = D + L + U" id="decomposition-title" />
        <p>D contém a diagonal de A; L e U contêm, respectivamente, as partes estritamente inferior e superior, com os mesmos sinais dos coeficientes de A.</p>
        <div className="stationary-matrices"><MatrixView label="A" values={run.matrix} /><span>=</span><MatrixView label="D" values={run.d} /><span>+</span><MatrixView label="L" values={run.l} /><span>+</span><MatrixView label="U" values={run.u} /></div>
        <p className="stationary-formula">{jacobi ? 'DX⁽ᵏ⁺¹⁾ = B − (L + U)X⁽ᵏ⁾' : '(D + L)X⁽ᵏ⁺¹⁾ = B − UX⁽ᵏ⁾'}</p>
        <p className="stationary-formula">X⁽ᵏ⁺¹⁾ = TX⁽ᵏ⁾ + C · {tFormula} · {cFormula}</p>
        {run.t && <div className="stationary-matrices"><MatrixView label="T — matriz de iteração" values={run.t} /><MatrixView label="C" values={column(run.c)} /><MatrixView label="B" values={column(run.b)} /></div>}
      </section>
      <section className="bisection-results" aria-labelledby="criteria-title"><Heading number="03" kicker="Antes de iterar" title="Critérios de convergência" id="criteria-title" />
        <div className="stationary-criteria">
          <article><h3>1. Dominância diagonal por linhas</h3><p>Estrita: |aᵢᵢ| &gt; Σⱼ≠ᵢ |aᵢⱼ| em todas as linhas. É suficiente para garantir convergência de ambos os métodos, para qualquer chute inicial.</p>
            <div className="bisection-table-scroll"><table><thead><tr><th>Linha</th><th>|aᵢᵢ|</th><th>Σⱼ≠ᵢ |aᵢⱼ|</th><th>Comparação</th></tr></thead><tbody>{run.dominance.map((row, i) => <tr key={i}><th>{i + 1}</th><td>{f(row.diagonal)}</td><td>{f(row.sum)}</td><td>{row.strict ? '>' : row.weak ? '=' : '<'}</td></tr>)}</tbody></table></div>
            <p className={`bisection-conclusion ${run.strict ? '' : 'is-warning'}`}>{run.strict ? 'Dominância estrita: convergência garantida.' : run.weak ? 'Dominância fraca (≥), com igualdade em alguma linha: sozinha não garante convergência.' : 'Não há dominância diagonal por linhas. O critério não garante convergência, mas também não implica divergência.'}</p>
          </article>
          <article><h3>2. Raio espectral da matriz de iteração</h3><p>ρ(T) = maxᵢ |λᵢ(T)|. A iteração converge para a solução única, para todo chute inicial, se e somente se ρ(T) &lt; 1.</p>
            {run.spectral ? <><ul>{run.spectral.values.map((v, i) => <li key={i}>λ<sub>{i + 1}</sub> ≈ {f(v.real)}{v.imaginary !== 0 ? ` ${v.imaginary < 0 ? '−' : '+'} ${f(Math.abs(v.imaginary))}i` : ''}; |λ<sub>{i + 1}</sub>| ≈ {f(v.modulus)}</li>)}</ul><p><strong>ρ(T) ≈ {f(run.spectral.radius)}</strong></p><p className={`bisection-conclusion ${run.spectral.status === 'convergent' ? '' : 'is-warning'}`}>{{ convergent: 'ρ(T) < 1: convergência prevista para todo chute inicial.', 'not-convergent': 'ρ(T) > 1: não há convergência para todo chute inicial. Chutes especiais ainda podem convergir.', boundary: 'ρ(T) está próximo de 1: diagnóstico numérico inconclusivo. Se ρ(T) = 1 exatamente, não há garantia para todo chute.', unknown: 'Não foi possível calcular o raio espectral com segurança.' }[run.spectral.status]}</p><small>Autovalores aproximados, incluindo pares complexos. Valores a até 10⁻⁸ de 1 são tratados como fronteira numérica.</small></> : <p>Critério indisponível: {run.message}</p>}
          </article>
        </div>
      </section>
      <section className="bisection-results" aria-labelledby="simulation-title"><Heading number="04" kicker="Acompanhe as aproximações" title={`${name}, passo a passo`} id="simulation-title" />
        <p className="stationary-formula">{jacobi ? 'xᵢ⁽ᵏ⁺¹⁾ = (bᵢ − Σⱼ≠ᵢ aᵢⱼxⱼ⁽ᵏ⁾) / aᵢᵢ' : 'xᵢ⁽ᵏ⁺¹⁾ = (bᵢ − Σⱼ<ᵢ aᵢⱼxⱼ⁽ᵏ⁺¹⁾ − Σⱼ>ᵢ aᵢⱼxⱼ⁽ᵏ⁾) / aᵢᵢ'}</p>
        {step ? <>
          <div className="bisection-playback"><div className="bisection-controls" aria-label="Controles da simulação"><button type="button" aria-label="Reiniciar" disabled={index === 0} onClick={() => select(0)}><RotateCcw size={17} /></button><button type="button" disabled={index === 0} onClick={() => select(index - 1)}><ChevronLeft size={18} /> Anterior</button><button type="button" className="is-primary" disabled={last === 0} aria-pressed={playing} onClick={() => { if (index === last) setIndex(0); setPlaying(!playing); }}>{playing ? <Pause size={18} /> : <Play size={18} />}{playing ? 'Pausar' : 'Reproduzir'}</button><button type="button" disabled={index === last} onClick={() => select(index + 1)}>Próxima <ChevronRight size={18} /></button></div>
            <label className="bisection-timeline">Iteração {index} de {last}<input type="range" min="0" max={last} value={index} disabled={last === 0} onChange={(e) => select(Number(e.target.value))} style={{ '--timeline-progress': `${last ? index / last * 100 : 100}%` }} /></label><label className="bisection-speed">Velocidade<select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{[[1100, '0,5×'], [650, '1×'], [300, '2×'], [150, '4×']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <div className="bisection-metrics" aria-live="polite"><div><span>Iteração</span><strong>{index}</strong></div><div><span>Variação relativa</span><strong>{f(step.delta)}</strong></div><div><span>Resíduo relativo</span><strong>{f(step.residual)}</strong></div><div><span>Estado</span><strong>{index === last ? run.converged ? 'Tolerância atingida' : 'Interrompida' : playing ? 'Em reprodução' : 'Pausada'}</strong></div></div>
          <div className="bisection-workspace"><div className="bisection-visual-panel"><div className="stationary-matrices">{index > 0 && <MatrixView label={`X⁽${index - 1}⁾ anterior`} values={column(run.steps[index - 1].x)} />}<MatrixView label={`X⁽${index}⁾`} values={column(step.x)} /></div><ResidualPlot steps={run.steps} index={index} /></div>
            <section className="iteration-terminal" aria-label="Cálculos da iteração atual"><div className="iteration-terminal-header"><span className="iteration-terminal-title">{method}/iteracao-{index}.log</span></div><div className="iteration-terminal-body" ref={terminal}><p className="iteration-terminal-line is-command">{jacobi ? 'Todos os termos usam X da iteração anterior.' : 'Valores novos são usados assim que ficam disponíveis, de cima para baixo.'}</p>{step.calculations.length === 0 ? <p className="iteration-terminal-line">Chute inicial informado: ({step.x.map(f).join('; ')})ᵀ.</p> : step.calculations.map((calc) => <div key={calc.row}><p className="iteration-terminal-line is-decision">x{calc.row + 1}⁽{index}⁾ = {f(calc.rhs)}{calc.terms.map((term) => ` − (${f(term.coefficient)})·(${f(term.value)})`).join('')} = {f(calc.value)}</p><p className="iteration-terminal-line is-muted">{calc.terms.map((term) => `x${term.column + 1} da iteração ${term.fresh ? index : index - 1}${term.fresh ? ' (novo)' : ' (anterior)'}`).join('; ')}.</p></div>)}<p className="iteration-terminal-line is-validation">Coeficientes exibidos divididos por aᵢᵢ. Os cálculos internos mantêm a precisão completa.</p></div></section>
          </div>
          <details className="bisection-table-panel"><summary>Histórico completo ({run.steps.length} aproximações)</summary><div className="bisection-table-scroll"><table><thead><tr><th>k</th>{run.matrix.map((_, i) => <th key={i}>x{i + 1}</th>)}<th>Variação relativa</th><th>Resíduo relativo</th></tr></thead><tbody>{run.steps.map((s, i) => <tr key={i} className={i === index ? 'is-active' : ''}><th><button type="button" aria-label={`Ver iteração ${i}`} onClick={() => select(i)}>{i}</button></th>{s.x.map((x, j) => <td key={j}>{f(x)}</td>)}<td>{f(s.delta)}</td><td>{f(s.residual)}</td></tr>)}</tbody></table></div></details>
        </> : null}
        {index === last && <p role="status" className={`bisection-conclusion ${run.converged ? '' : 'is-warning'}`}>{run.message}</p>}
      </section>
      <aside className="bisection-method-note"><span aria-hidden="true">i</span><div><h2>Quando a simulação para?</h2><p>Exigimos simultaneamente ‖X⁽ᵏ⁺¹⁾ − X⁽ᵏ⁾‖∞ / max(1, ‖X⁽ᵏ⁺¹⁾‖∞) ≤ ε e resíduo relativo ≤ ε. Para comparar equações de escalas diferentes, calculamos o resíduo com Ā = D⁻¹A e B̄ = D⁻¹B: ‖ĀX − B̄‖∞ / (‖Ā‖∞‖X‖∞ + ‖B̄‖∞). Se o denominador é zero, usamos o resíduo absoluto. O limite de iterações também encerra o processo. Atingir a tolerância para este chute é diferente de garantir convergência para todos os chutes.</p></div></aside>
    </main><Footer />
  </div>;
}
