import { useId, useMemo } from "react";

const WIDTH = 780;
const HEIGHT = 470;
const MARGIN = { top: 72, right: 30, bottom: 58, left: 68 };
const HISTORY_HEIGHT = 190;
const HISTORY_MARGIN = { top: 48, right: 28, bottom: 42, left: 68 };

const COLORS = {
  background: "#081a2a",
  raised: "#0d2639",
  border: "#45657f",
  grid: "#8db0c9",
  ink: "#eaf4fc",
  muted: "#9cb7c9",
  curve: "#77bce6",
  identity: "#e5b85e",
  cobweb: "#5bc0b5",
  active: "#f1cc78",
  warning: "#dc867b",
};

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatNumber(value, digits = 6) {
  const number = finite(value);
  if (number === null) return "—";
  if (number === 0) return "0";
  const magnitude = Math.abs(number);
  if (magnitude >= 1e5 || magnitude < 1e-4) {
    return number.toExponential(Math.max(1, digits - 2)).replace("e+", "e");
  }
  return Number(number.toPrecision(digits)).toString();
}

function safelyEvaluate(evaluate, x) {
  if (typeof evaluate !== "function" || !Number.isFinite(x)) return null;
  try {
    return finite(evaluate(x));
  } catch {
    return null;
  }
}

function percentile(values, position) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * position;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
}

function trajectoryFor(iterations, initialX, count = iterations.length) {
  const values = [];
  const first = finite(initialX) ?? finite(iterations[0]?.xCurrent);
  if (first !== null) values.push(first);
  iterations.slice(0, count).forEach((step) => {
    const value = finite(step?.xNext);
    if (value !== null) values.push(value);
  });
  return values;
}

function initialDomain(run, visibleIterations) {
  const trajectory = trajectoryFor(visibleIterations, run?.initialX);
  const values = trajectory.length ? trajectory : [finite(run?.initialX) ?? 0];
  let lower = Math.min(...values);
  let upper = Math.max(...values);
  const center = (lower + upper) / 2;
  const naturalSpan = upper - lower;
  const minimumSpan = Math.max(1.4, Math.abs(center) * 0.7);
  const span = Math.max(naturalSpan, minimumSpan);
  lower = center - span * 0.62;
  upper = center + span * 0.62;
  return [lower, upper];
}

function sampleFunction(evaluate, minimum, maximum, count = 321) {
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    const x = minimum + ((maximum - minimum) * index) / (count - 1);
    samples.push({ x, y: safelyEvaluate(evaluate, x) });
  }
  return samples;
}

function getSquareDomain(run, visibleIterations) {
  const [initialMinimum, initialMaximum] = initialDomain(run, visibleIterations);
  const initialSpan = initialMaximum - initialMinimum;
  const center = (initialMinimum + initialMaximum) / 2;
  const probe = sampleFunction(run?.evaluate, initialMinimum, initialMaximum, 181);
  const yValues = probe.map((sample) => sample.y).filter((value) => value !== null);
  const robustLow = percentile(yValues, 0.04);
  const robustHigh = percentile(yValues, 0.96);
  const guardLow = center - initialSpan * 3.5;
  const guardHigh = center + initialSpan * 3.5;
  let minimum = Math.min(initialMinimum, clamp(robustLow ?? initialMinimum, guardLow, guardHigh));
  let maximum = Math.max(initialMaximum, clamp(robustHigh ?? initialMaximum, guardLow, guardHigh));
  const padding = Math.max((maximum - minimum) * 0.07, 0.08);
  minimum -= padding;
  maximum += padding;
  return [minimum, maximum];
}

function niceStep(span, desiredCount = 7) {
  const raw = span / Math.max(1, desiredCount);
  const power = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / power;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * power;
}

function makeTicks(minimum, maximum, desiredCount = 7) {
  const step = niceStep(maximum - minimum, desiredCount);
  const first = Math.ceil(minimum / step) * step;
  const ticks = [];
  for (let value = first; value <= maximum + step * 0.001; value += step) {
    ticks.push(Math.abs(value) < step * 1e-10 ? 0 : value);
  }
  return ticks;
}

function buildCurvePaths(samples, xScale, yScale, minimum, maximum) {
  const paths = [];
  const span = maximum - minimum;
  let points = [];
  let previous = null;
  const flush = () => {
    if (points.length > 1) paths.push(points.join(" "));
    points = [];
    previous = null;
  };

  samples.forEach(({ x, y }) => {
    if (y === null || y < minimum - span * 0.2 || y > maximum + span * 0.2) {
      flush();
      return;
    }
    if (previous !== null && Math.abs(y - previous) > span * 0.75) flush();
    points.push(`${points.length ? "L" : "M"} ${xScale(x).toFixed(2)} ${yScale(y).toFixed(2)}`);
    previous = y;
  });
  flush();
  return paths;
}

function EmptyPlot({ titleId, descriptionId }) {
  return (
    <svg
      className="fixed-point-plot bisection-plot"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <title id={titleId}>Diagrama de teia do método do ponto fixo aguardando dados</title>
      <desc id={descriptionId}>Execute uma simulação para comparar g de x com a reta y igual a x.</desc>
      <rect x="0.5" y="0.5" width={WIDTH - 1} height={HEIGHT - 1} fill={COLORS.background} stroke={COLORS.border} />
      <line x1="70" x2={WIDTH - 30} y1={HEIGHT / 2} y2={HEIGHT / 2} stroke={COLORS.muted} opacity="0.35" />
      <line x1={WIDTH / 2} x2={WIDTH / 2} y1="70" y2={HEIGHT - 58} stroke={COLORS.muted} opacity="0.35" />
      <text x={WIDTH / 2} y={HEIGHT / 2 + 45} fill={COLORS.muted} fontFamily="IBM Plex Mono, monospace" fontSize="14" textAnchor="middle">
        Aguardando uma simulação
      </text>
    </svg>
  );
}

function FixedPointPlot({ run, activeIndex }) {
  const generatedId = useId().replace(/:/g, "");
  const titleId = `fixed-point-plot-title-${generatedId}`;
  const descriptionId = `fixed-point-plot-description-${generatedId}`;
  const historyTitleId = `fixed-point-history-title-${generatedId}`;
  const historyDescriptionId = `fixed-point-history-description-${generatedId}`;
  const clipId = `fixed-point-clip-${generatedId}`;
  const iterations = Array.isArray(run?.iterations) ? run.iterations : [];
  const currentIndex = iterations.length
    ? clamp(Math.trunc(finite(activeIndex) ?? iterations.length - 1), 0, iterations.length - 1)
    : -1;
  const visibleIterations = currentIndex >= 0 ? iterations.slice(0, currentIndex + 1) : [];
  const currentStep = visibleIterations.at(-1);
  const visibleTrajectory = trajectoryFor(visibleIterations, run?.initialX);
  const fullTrajectory = trajectoryFor(iterations, run?.initialX);
  const [minimum, maximum] = useMemo(
    () => getSquareDomain(run, iterations),
    [run, iterations],
  );
  const samples = useMemo(
    () => sampleFunction(run?.evaluate, minimum, maximum),
    [run?.evaluate, minimum, maximum],
  );

  if (!currentStep) {
    return (
      <figure className="fixed-point-visualization bisection-visualization" style={{ margin: 0 }}>
        <EmptyPlot titleId={titleId} descriptionId={descriptionId} />
      </figure>
    );
  }

  const plotRight = WIDTH - MARGIN.right;
  const plotBottom = HEIGHT - MARGIN.bottom;
  const innerWidth = plotRight - MARGIN.left;
  const innerHeight = plotBottom - MARGIN.top;
  const xScale = (value) => MARGIN.left + ((value - minimum) / (maximum - minimum)) * innerWidth;
  const yScale = (value) => plotBottom - ((value - minimum) / (maximum - minimum)) * innerHeight;
  const ticks = makeTicks(minimum, maximum);
  const curvePaths = buildCurvePaths(samples, xScale, yScale, minimum, maximum);
  const axisY = minimum <= 0 && maximum >= 0 ? yScale(0) : plotBottom;
  const axisX = minimum <= 0 && maximum >= 0 ? xScale(0) : MARGIN.left;
  const cobwebSegments = visibleIterations.flatMap((step, index) => {
    const from = finite(step.xCurrent);
    const next = finite(step.xNext);
    if (from === null || next === null) return [];
    return [
      { key: `${index}-vertical`, x1: from, y1: from, x2: from, y2: next, active: index === currentIndex },
      { key: `${index}-horizontal`, x1: from, y1: next, x2: next, y2: next, active: index === currentIndex },
    ];
  });
  const derivative = finite(currentStep.derivativeEstimate);
  const contractive = derivative !== null ? Math.abs(derivative) < 1 : null;
  const expression = String(run?.expression || "g(x)");

  const historyRight = WIDTH - HISTORY_MARGIN.right;
  const historyBottom = HISTORY_HEIGHT - HISTORY_MARGIN.bottom;
  const historyWidth = historyRight - HISTORY_MARGIN.left;
  const historyInnerHeight = historyBottom - HISTORY_MARGIN.top;
  let historyMinimum = Math.min(...fullTrajectory);
  let historyMaximum = Math.max(...fullTrajectory);
  if (historyMinimum === historyMaximum) {
    const expansion = Math.max(Math.abs(historyMinimum) * 0.1, 0.5);
    historyMinimum -= expansion;
    historyMaximum += expansion;
  }
  const historyPadding = (historyMaximum - historyMinimum) * 0.14;
  historyMinimum -= historyPadding;
  historyMaximum += historyPadding;
  const historyXScale = (index) => HISTORY_MARGIN.left + (visibleTrajectory.length <= 1 ? 0 : index / (visibleTrajectory.length - 1)) * historyWidth;
  const historyYScale = (value) => historyBottom - ((value - historyMinimum) / (historyMaximum - historyMinimum)) * historyInnerHeight;
  const historyPath = visibleTrajectory.map((value, index) => `${index ? "L" : "M"} ${historyXScale(index).toFixed(2)} ${historyYScale(value).toFixed(2)}`).join(" ");
  const showFinalGuide = currentIndex === iterations.length - 1 && run?.converged && finite(run?.root) !== null;

  return (
    <figure
      className="fixed-point-visualization bisection-visualization"
      style={{ display: "grid", gap: "12px", margin: 0, minWidth: 0 }}
    >
      <svg
        className="fixed-point-plot bisection-plot"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <title id={titleId}>Diagrama de teia do ponto fixo na iteração {currentStep.iteration}</title>
        <desc id={descriptionId}>
          Gráfico de g de x e da reta y igual a x. A teia percorre {visibleIterations.length} iterações,
          chegando a x igual a {formatNumber(currentStep.xNext)}.
        </desc>
        <defs>
          <clipPath id={clipId}>
            <rect x={MARGIN.left} y={MARGIN.top} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>
        <rect x="0.5" y="0.5" width={WIDTH - 1} height={HEIGHT - 1} fill={COLORS.background} stroke={COLORS.border} />

        <g aria-hidden="true" fontFamily="IBM Plex Mono, monospace">
          <line x1={MARGIN.left} x2={MARGIN.left + 25} y1="27" y2="27" stroke={COLORS.curve} strokeWidth="3" />
          <text x={MARGIN.left + 34} y="31" fill={COLORS.ink} fontSize="11.5">y = g(x)</text>
          <line x1={MARGIN.left + 145} x2={MARGIN.left + 170} y1="27" y2="27" stroke={COLORS.identity} strokeWidth="2" strokeDasharray="7 5" />
          <text x={MARGIN.left + 179} y="31" fill={COLORS.ink} fontSize="11.5">y = x</text>
          <line x1={MARGIN.left + 260} x2={MARGIN.left + 285} y1="27" y2="27" stroke={COLORS.cobweb} strokeWidth="2.5" />
          <text x={MARGIN.left + 294} y="31" fill={COLORS.ink} fontSize="11.5">teia xₙ</text>
          <text x={MARGIN.left} y="54" fill={COLORS.muted} fontSize="11">
            i={currentStep.iteration} · xₙ₊₁={formatNumber(currentStep.xNext, 7)} · |g′| {derivative === null ? "não estimado" : `${contractive ? "<" : "≥"} 1`}
          </text>
        </g>

        <g clipPath={`url(#${clipId})`} aria-hidden="true">
          {ticks.map((tick) => (
            <g key={`grid-${tick}`}>
              <line x1={xScale(tick)} x2={xScale(tick)} y1={MARGIN.top} y2={plotBottom} stroke={COLORS.grid} opacity="0.14" />
              <line x1={MARGIN.left} x2={plotRight} y1={yScale(tick)} y2={yScale(tick)} stroke={COLORS.grid} opacity="0.14" />
            </g>
          ))}
          <line x1={MARGIN.left} x2={plotRight} y1={axisY} y2={axisY} stroke={COLORS.muted} opacity="0.7" />
          <line x1={axisX} x2={axisX} y1={MARGIN.top} y2={plotBottom} stroke={COLORS.muted} opacity="0.7" />
          <line x1={xScale(minimum)} x2={xScale(maximum)} y1={yScale(minimum)} y2={yScale(maximum)} stroke={COLORS.identity} strokeWidth="2" strokeDasharray="8 6" />
          {curvePaths.map((path, index) => (
            <path key={`curve-${index}`} d={path} fill="none" stroke={COLORS.curve} strokeWidth="2.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ))}
          {cobwebSegments.map((segment) => (
            <line
              key={segment.key}
              x1={xScale(segment.x1)}
              y1={yScale(segment.y1)}
              x2={xScale(segment.x2)}
              y2={yScale(segment.y2)}
              stroke={segment.active ? COLORS.active : COLORS.cobweb}
              strokeWidth={segment.active ? 3.2 : 2.1}
              opacity={segment.active ? 1 : 0.78}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {visibleTrajectory.map((value, index) => (
            <circle
              key={`identity-point-${index}`}
              cx={xScale(value)}
              cy={yScale(value)}
              r={index === visibleTrajectory.length - 1 ? 5.2 : 3.1}
              fill={index === visibleTrajectory.length - 1 ? COLORS.active : COLORS.cobweb}
              stroke={COLORS.background}
              strokeWidth="2"
            >
              <title>x{index} = {formatNumber(value, 9)}</title>
            </circle>
          ))}
        </g>

        <rect x={MARGIN.left} y={MARGIN.top} width={innerWidth} height={innerHeight} fill="none" stroke={COLORS.border} />
        <g aria-hidden="true" fill={COLORS.muted} fontFamily="IBM Plex Mono, monospace" fontSize="10.5">
          {ticks.map((tick) => (
            <g key={`labels-${tick}`}>
              <text x={xScale(tick)} y={plotBottom + 20} textAnchor="middle">{formatNumber(tick, 4)}</text>
              <text x={MARGIN.left - 10} y={yScale(tick) + 3.5} textAnchor="end">{formatNumber(tick, 4)}</text>
            </g>
          ))}
          <text x={plotRight} y={plotBottom + 40} fill={COLORS.ink} textAnchor="end">xₙ</text>
          <text x={MARGIN.left - 8} y={MARGIN.top - 10} fill={COLORS.ink} textAnchor="end">g(x)</text>
        </g>
        {!curvePaths.length ? (
          <text x={WIDTH / 2} y={HEIGHT / 2} fill={COLORS.warning} fontFamily="IBM Plex Mono, monospace" fontSize="13" textAnchor="middle">
            g(x) não pôde ser desenhada neste domínio.
          </text>
        ) : null}
      </svg>

      <div
        className="fixed-point-sequence-history bisection-interval-history"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.background, overflow: "hidden" }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HISTORY_HEIGHT}`}
          role="img"
          aria-labelledby={`${historyTitleId} ${historyDescriptionId}`}
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <title id={historyTitleId}>Histórico das aproximações até x {visibleTrajectory.length - 1}</title>
          <desc id={historyDescriptionId}>
            Sequência com {visibleTrajectory.length} pontos, iniciando em {formatNumber(visibleTrajectory[0])} e chegando a {formatNumber(visibleTrajectory.at(-1))}.
          </desc>
          <rect width={WIDTH} height={HISTORY_HEIGHT} fill={COLORS.background} />
          <text x={HISTORY_MARGIN.left} y="26" fill={COLORS.ink} fontFamily="IBM Plex Mono, monospace" fontSize="12">
            TRAJETÓRIA DAS APROXIMAÇÕES · x₀ → xₙ
          </text>
          {[0, 0.5, 1].map((ratio) => {
            const y = HISTORY_MARGIN.top + ratio * historyInnerHeight;
            const value = historyMaximum - ratio * (historyMaximum - historyMinimum);
            return (
              <g key={`history-grid-${ratio}`} aria-hidden="true">
                <line x1={HISTORY_MARGIN.left} x2={historyRight} y1={y} y2={y} stroke={COLORS.grid} opacity="0.14" />
                <text x={HISTORY_MARGIN.left - 9} y={y + 3.5} fill={COLORS.muted} fontFamily="IBM Plex Mono, monospace" fontSize="9.5" textAnchor="end">
                  {formatNumber(value, 4)}
                </text>
              </g>
            );
          })}
          {showFinalGuide ? (
            <line
              x1={HISTORY_MARGIN.left}
              x2={historyRight}
              y1={historyYScale(run.root)}
              y2={historyYScale(run.root)}
              stroke={COLORS.identity}
              strokeDasharray="5 5"
              opacity="0.7"
              aria-hidden="true"
            />
          ) : null}
          <path d={historyPath} fill="none" stroke={COLORS.cobweb} strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" aria-hidden="true" />
          {visibleTrajectory.map((value, index) => (
            <g key={`history-point-${index}`}>
              <circle
                cx={historyXScale(index)}
                cy={historyYScale(value)}
                r={index === visibleTrajectory.length - 1 ? 5 : 3.3}
                fill={index === visibleTrajectory.length - 1 ? COLORS.active : COLORS.cobweb}
                stroke={COLORS.background}
                strokeWidth="1.5"
              >
                <title>x{index} = {formatNumber(value, 10)}</title>
              </circle>
              {(visibleTrajectory.length <= 12 || index === 0 || index === visibleTrajectory.length - 1) ? (
                <text
                  x={historyXScale(index)}
                  y={historyBottom + 18}
                  fill={index === visibleTrajectory.length - 1 ? COLORS.active : COLORS.muted}
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize="9.5"
                  textAnchor="middle"
                >
                  {index}
                </text>
              ) : null}
            </g>
          ))}
          <text x={historyRight} y={HISTORY_HEIGHT - 9} fill={COLORS.muted} fontFamily="IBM Plex Mono, monospace" fontSize="9.5" textAnchor="end">índice n</text>
        </svg>
      </div>
    </figure>
  );
}

export default FixedPointPlot;
