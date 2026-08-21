import { useId, useMemo } from "react";

const WIDTH = 760;
const HEIGHT = 430;
const MARGIN = { top: 69, right: 25, bottom: 57, left: 67 };
const HISTORY_WIDTH = 760;
const HISTORY_MARGIN = { top: 62, right: 22, bottom: 20, left: 62 };
const HISTORY_ROW_HEIGHT = 28;
const HISTORY_STACK_HEIGHT = 165;
const MAX_PLOT_VALUE = Number.MAX_VALUE / 8;

const COLORS = {
  background: "#081a2a",
  border: "#45657f",
  grid: "#8db0c9",
  ink: "#eaf4fc",
  muted: "#a9bfd0",
  curve: "#77bce6",
  bracket: "#5bc0b5",
  secant: "#edc466",
  estimate: "#f2a36f",
  axis: "#b8cede",
};

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampPlotValue(value) {
  return clamp(value, -MAX_PLOT_VALUE, MAX_PLOT_VALUE);
}

function formatNumber(value, significantDigits = 6) {
  const number = finite(value);
  if (number === null) return "—";
  if (number === 0) return "0";
  const magnitude = Math.abs(number);
  if (magnitude >= 1e5 || magnitude < 1e-4) {
    return number.toExponential(Math.max(1, significantDigits - 2)).replace("e+", "e");
  }
  return Number(number.toPrecision(significantDigits)).toString();
}

function safelyEvaluate(evaluate, x) {
  if (typeof evaluate !== "function" || !Number.isFinite(x)) return null;
  try {
    return finite(evaluate(x));
  } catch {
    return null;
  }
}

function getXDomain(run, iterations) {
  const firstStep = iterations[0];
  const a = finite(run?.initialA) ?? finite(firstStep?.a) ?? -1;
  const b = finite(run?.initialB) ?? finite(firstStep?.b) ?? 1;
  const lower = Math.min(a, b);
  const upper = Math.max(a, b);
  const span = upper - lower;
  const padding = span > 0 ? span * 0.08 : Math.max(Math.abs(lower) * 0.08, 1);
  const paddedLower = lower - padding;
  const paddedUpper = upper + padding;

  if (Number.isFinite(paddedLower) && Number.isFinite(paddedUpper) && paddedUpper > paddedLower) {
    return [paddedLower, paddedUpper];
  }
  return lower < upper ? [lower, upper] : [lower - 1, upper + 1];
}

function sampleFunction(evaluate, xMinimum, xMaximum, count = 301) {
  const samples = [];
  const span = xMaximum - xMinimum;
  for (let index = 0; index < count; index += 1) {
    const x = xMinimum + (span * index) / (count - 1);
    samples.push({ x, y: safelyEvaluate(evaluate, x) });
  }
  return samples;
}

function percentile(sortedValues, fraction) {
  if (sortedValues.length === 0) return null;
  const position = (sortedValues.length - 1) * fraction;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const weight = position - lowerIndex;
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

function getYDomain(samples, iterations) {
  const samplesY = samples
    .map(({ y }) => y)
    .filter((value) => value !== null)
    .map(clampPlotValue)
    .sort((left, right) => left - right);
  const iterationY = iterations
    .flatMap((step) => [step.fA, step.fB, step.fEstimate])
    .map(finite)
    .filter((value) => value !== null)
    .map(clampPlotValue);
  let minimum = percentile(samplesY, 0.02);
  let maximum = percentile(samplesY, 0.98);

  if (minimum === null || maximum === null) {
    minimum = iterationY.length ? Math.min(...iterationY) : -1;
    maximum = iterationY.length ? Math.max(...iterationY) : 1;
  }
  minimum = Math.min(minimum, 0, ...iterationY);
  maximum = Math.max(maximum, 0, ...iterationY);

  if (!(maximum > minimum)) {
    const expansion = Math.max(Math.abs(minimum) * 0.2, 1);
    minimum -= expansion;
    maximum += expansion;
  }

  const padding = (maximum - minimum) * 0.1;
  return [minimum - padding, maximum + padding];
}

function niceStep(span, desiredCount) {
  const rough = span / Math.max(desiredCount, 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * power;
}

function makeTicks(minimum, maximum, desiredCount) {
  const span = maximum - minimum;
  if (!(span > 0)) return [minimum];
  const step = niceStep(span, desiredCount);
  const first = Math.ceil(minimum / step) * step;
  const ticks = [];
  for (let tick = first; tick <= maximum + step * 0.001; tick += step) {
    ticks.push(Math.abs(tick) < step * 1e-10 ? 0 : tick);
  }
  return ticks;
}

function buildCurvePaths(samples, xScale, yScale, yMinimum, yMaximum) {
  const paths = [];
  const ySpan = yMaximum - yMinimum;
  let commands = [];
  let previousY = null;
  const flush = () => {
    if (commands.length > 1) paths.push(commands.join(" "));
    commands = [];
    previousY = null;
  };

  samples.forEach(({ x, y }) => {
    if (y === null || (previousY !== null && Math.abs(y - previousY) > ySpan * 0.9)) {
      flush();
      if (y === null) return;
    }
    const boundedY = clamp(y, yMinimum - ySpan * 0.2, yMaximum + ySpan * 0.2);
    commands.push(`${commands.length ? "L" : "M"} ${xScale(x).toFixed(2)} ${yScale(boundedY).toFixed(2)}`);
    previousY = y;
  });
  flush();
  return paths;
}

function Endpoint({ x, y, label, square = false }) {
  const labelAbove = y > MARGIN.top + 30;
  return (
    <g aria-hidden="true">
      {square ? (
        <rect x={x - 5} y={y - 5} width="10" height="10" fill={COLORS.bracket} stroke={COLORS.background} strokeWidth="2" />
      ) : (
        <circle cx={x} cy={y} r="5.2" fill={COLORS.bracket} stroke={COLORS.background} strokeWidth="2" />
      )}
      <text
        x={x + (square ? 8 : -8)}
        y={labelAbove ? y - 11 : y + 21}
        fill={COLORS.bracket}
        fontFamily="IBM Plex Mono, Courier New, monospace"
        fontSize="12"
        fontWeight="600"
        paintOrder="stroke"
        stroke={COLORS.background}
        strokeWidth="3"
        textAnchor={square ? "start" : "end"}
      >
        {label}
      </text>
    </g>
  );
}

function EmptyPlot({ titleId, descriptionId }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <title id={titleId}>Gráfico da falsa posição aguardando dados</title>
      <desc id={descriptionId}>Execute uma simulação para visualizar a função, as secantes e os intervalos retidos.</desc>
      <rect x="0.5" y="0.5" width={WIDTH - 1} height={HEIGHT - 1} fill={COLORS.background} stroke={COLORS.border} />
      <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={HEIGHT / 2} y2={HEIGHT / 2} stroke={COLORS.axis} opacity="0.45" />
      <text x={WIDTH / 2} y={HEIGHT / 2 + 46} fill={COLORS.muted} fontFamily="IBM Plex Mono, monospace" fontSize="15" textAnchor="middle">
        Aguardando uma simulação
      </text>
    </svg>
  );
}

function FalsePositionPlot({ run, activeIndex }) {
  const generatedId = useId().replace(/:/g, "");
  const plotTitleId = `false-position-plot-title-${generatedId}`;
  const plotDescriptionId = `false-position-plot-description-${generatedId}`;
  const historyTitleId = `false-position-history-title-${generatedId}`;
  const historyDescriptionId = `false-position-history-description-${generatedId}`;
  const clipId = `false-position-clip-${generatedId}`;
  const iterations = Array.isArray(run?.iterations) ? run.iterations : [];
  const currentIndex = iterations.length
    ? clamp(Math.trunc(finite(activeIndex) ?? iterations.length - 1), 0, iterations.length - 1)
    : -1;
  const currentStep = currentIndex >= 0 ? iterations[currentIndex] : null;
  const [xMinimum, xMaximum] = getXDomain(run, iterations);
  const samples = useMemo(
    () => sampleFunction(run?.evaluate, xMinimum, xMaximum),
    [run?.evaluate, xMinimum, xMaximum],
  );
  const [yMinimum, yMaximum] = useMemo(
    () => getYDomain(samples, iterations),
    [samples, iterations],
  );

  if (!currentStep) {
    return (
      <figure className="bisection-visualization false-position-visualization" style={{ margin: 0 }}>
        <EmptyPlot titleId={plotTitleId} descriptionId={plotDescriptionId} />
      </figure>
    );
  }

  const plotRight = WIDTH - MARGIN.right;
  const plotBottom = HEIGHT - MARGIN.bottom;
  const innerWidth = plotRight - MARGIN.left;
  const innerHeight = plotBottom - MARGIN.top;
  const xScale = (value) => MARGIN.left + ((value - xMinimum) / (xMaximum - xMinimum)) * innerWidth;
  const yScale = (value) => plotBottom
    - ((clamp(value, yMinimum, yMaximum) - yMinimum) / (yMaximum - yMinimum)) * innerHeight;
  const xTicks = makeTicks(xMinimum, xMaximum, 7);
  const yTicks = makeTicks(yMinimum, yMaximum, 6);
  const curvePaths = buildCurvePaths(samples, xScale, yScale, yMinimum, yMaximum);
  const a = finite(currentStep.a) ?? xMinimum;
  const b = finite(currentStep.b) ?? xMaximum;
  const fA = finite(currentStep.fA) ?? safelyEvaluate(run?.evaluate, a) ?? 0;
  const fB = finite(currentStep.fB) ?? safelyEvaluate(run?.evaluate, b) ?? 0;
  const estimate = finite(currentStep.estimate) ?? a;
  const fEstimate = finite(currentStep.fEstimate) ?? safelyEvaluate(run?.evaluate, estimate) ?? 0;
  const xAxisY = yScale(0);
  const yAxisX = xMinimum <= 0 && xMaximum >= 0 ? xScale(0) : MARGIN.left;
  const intervalLeft = Math.min(a, b);
  const intervalRight = Math.max(a, b);
  const iterationLabel = currentStep.iteration ?? currentIndex + 1;
  const expression = String(run?.expression || "f(x)");
  const visibleHistory = iterations.slice(0, currentIndex + 1);
  const historyGap = visibleHistory.length <= 1
    ? 0
    : Math.min(HISTORY_ROW_HEIGHT, HISTORY_STACK_HEIGHT / (visibleHistory.length - 1));
  const historyHeight = Math.max(
    108,
    HISTORY_MARGIN.top + Math.max(0, visibleHistory.length - 1) * historyGap + HISTORY_MARGIN.bottom,
  );
  const historyRight = HISTORY_WIDTH - HISTORY_MARGIN.right;
  const historyScale = (value) => HISTORY_MARGIN.left
    + ((value - xMinimum) / (xMaximum - xMinimum)) * (historyRight - HISTORY_MARGIN.left);
  const historyLabelStride = historyGap > 0 ? Math.max(1, Math.ceil(14 / historyGap)) : 1;
  const initialA = finite(run?.initialA) ?? finite(iterations[0]?.a) ?? a;
  const initialB = finite(run?.initialB) ?? finite(iterations[0]?.b) ?? b;
  const estimatePolyline = visibleHistory
    .map((step, index) => `${historyScale(finite(step.estimate) ?? step.a)},${HISTORY_MARGIN.top + index * historyGap}`)
    .join(" ");

  return (
    <figure
      className="bisection-visualization false-position-visualization"
      style={{ display: "grid", gap: "12px", margin: 0, minWidth: 0 }}
    >
      <svg
        className="bisection-plot false-position-plot"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-labelledby={`${plotTitleId} ${plotDescriptionId}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <title id={plotTitleId}>Método da falsa posição, iteração {iterationLabel}</title>
        <desc id={plotDescriptionId}>
          Gráfico de {expression}. A secante liga ({formatNumber(a)}, {formatNumber(fA)}) a ({formatNumber(b)}, {formatNumber(fB)})
          e cruza o eixo x em c igual a {formatNumber(estimate)}, onde f(c) vale {formatNumber(fEstimate)}.
        </desc>
        <defs>
          <clipPath id={clipId}>
            <rect x={MARGIN.left} y={MARGIN.top} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        <rect x="0.5" y="0.5" width={WIDTH - 1} height={HEIGHT - 1} fill={COLORS.background} stroke={COLORS.border} />

        <g aria-hidden="true" fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="11.5">
          <circle cx={MARGIN.left + 4} cy="24" r="4.5" fill={COLORS.bracket} />
          <text x={MARGIN.left + 16} y="28" fill={COLORS.ink}>extremos aₙ, bₙ</text>
          <line x1={MARGIN.left + 178} x2={MARGIN.left + 201} y1="24" y2="24" stroke={COLORS.secant} strokeWidth="2.8" />
          <text x={MARGIN.left + 209} y="28" fill={COLORS.ink}>secante</text>
          <rect x={MARGIN.left + 329} y="19" width="9" height="9" fill={COLORS.estimate} transform={`rotate(45 ${MARGIN.left + 333.5} 23.5)`} />
          <text x={MARGIN.left + 346} y="28" fill={COLORS.ink}>cₙ = {formatNumber(estimate, 6)}</text>
          <text x={MARGIN.left} y="51" fill={COLORS.muted}>
            iteração {iterationLabel} · |f(cₙ)| = {formatNumber(Math.abs(fEstimate), 5)} · {currentStep.iteration === 1 ? "|b − a|" : "|Δc|"} = {formatNumber(currentStep.errorEstimate, 5)}
          </text>
        </g>

        <g clipPath={`url(#${clipId})`} aria-hidden="true">
          <rect
            x={xScale(intervalLeft)}
            y={MARGIN.top}
            width={Math.max(0.8, xScale(intervalRight) - xScale(intervalLeft))}
            height={innerHeight}
            fill={COLORS.bracket}
            opacity="0.11"
          />

          {xTicks.map((tick) => (
            <line key={`x-grid-${tick}`} x1={xScale(tick)} x2={xScale(tick)} y1={MARGIN.top} y2={plotBottom} stroke={COLORS.grid} opacity="0.16" />
          ))}
          {yTicks.map((tick) => (
            <line key={`y-grid-${tick}`} x1={MARGIN.left} x2={plotRight} y1={yScale(tick)} y2={yScale(tick)} stroke={COLORS.grid} opacity="0.16" />
          ))}
          <line x1={MARGIN.left} x2={plotRight} y1={xAxisY} y2={xAxisY} stroke={COLORS.axis} strokeWidth="1.2" opacity="0.78" />
          <line x1={yAxisX} x2={yAxisX} y1={MARGIN.top} y2={plotBottom} stroke={COLORS.axis} strokeWidth="1.2" opacity="0.72" />

          {curvePaths.map((path, index) => (
            <path key={`curve-${index}`} d={path} fill="none" stroke={COLORS.curve} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}

          <line
            x1={xScale(a)}
            y1={yScale(fA)}
            x2={xScale(b)}
            y2={yScale(fB)}
            stroke={COLORS.secant}
            strokeWidth="2.5"
            opacity="0.96"
            vectorEffect="non-scaling-stroke"
          />
          <line x1={xScale(a)} x2={xScale(a)} y1={xAxisY} y2={yScale(fA)} stroke={COLORS.bracket} strokeDasharray="5 5" opacity="0.68" />
          <line x1={xScale(b)} x2={xScale(b)} y1={xAxisY} y2={yScale(fB)} stroke={COLORS.bracket} strokeDasharray="5 5" opacity="0.68" />
          <line x1={xScale(estimate)} x2={xScale(estimate)} y1={xAxisY} y2={yScale(fEstimate)} stroke={COLORS.estimate} strokeDasharray="3 4" strokeWidth="1.7" opacity="0.95" />

          <Endpoint x={xScale(a)} y={yScale(fA)} label="aₙ" />
          <Endpoint x={xScale(b)} y={yScale(fB)} label="bₙ" square />

          <circle cx={xScale(estimate)} cy={yScale(fEstimate)} r="4.3" fill={COLORS.curve} stroke={COLORS.background} strokeWidth="2" />
          <rect
            x={xScale(estimate) - 5}
            y={xAxisY - 5}
            width="10"
            height="10"
            fill={COLORS.estimate}
            stroke={COLORS.background}
            strokeWidth="2"
            transform={`rotate(45 ${xScale(estimate)} ${xAxisY})`}
          />
          <text
            x={xScale(estimate)}
            y={xAxisY > MARGIN.top + 32 ? xAxisY - 14 : xAxisY + 25}
            fill={COLORS.estimate}
            fontFamily="IBM Plex Mono, Courier New, monospace"
            fontSize="12"
            fontWeight="600"
            paintOrder="stroke"
            stroke={COLORS.background}
            strokeWidth="3"
            textAnchor="middle"
          >
            cₙ
          </text>
        </g>

        <rect x={MARGIN.left} y={MARGIN.top} width={innerWidth} height={innerHeight} fill="none" stroke={COLORS.border} />
        <g aria-hidden="true" fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="10.5">
          {xTicks.map((tick) => <text key={`x-label-${tick}`} x={xScale(tick)} y={plotBottom + 20} textAnchor="middle">{formatNumber(tick, 4)}</text>)}
          {yTicks.map((tick) => <text key={`y-label-${tick}`} x={MARGIN.left - 9} y={yScale(tick) + 3.5} textAnchor="end">{formatNumber(tick, 4)}</text>)}
          <text x={plotRight} y={plotBottom + 40} fill={COLORS.ink} textAnchor="end">x</text>
          <text x={MARGIN.left - 9} y={MARGIN.top - 8} fill={COLORS.ink} textAnchor="end">f(x)</text>
        </g>
        {curvePaths.length === 0 ? (
          <text x={(MARGIN.left + plotRight) / 2} y={(MARGIN.top + plotBottom) / 2} fill={COLORS.muted} fontFamily="IBM Plex Mono, monospace" fontSize="13" textAnchor="middle">
            Não foi possível representar f(x) neste domínio.
          </text>
        ) : null}
      </svg>

      <div
        className="bisection-interval-history false-position-interval-history"
        style={{
          maxHeight: "245px",
          overflowY: "auto",
          overscrollBehavior: "contain",
          border: `1px solid ${COLORS.border}`,
          borderRadius: "2px",
          background: COLORS.background,
        }}
      >
        <svg
          viewBox={`0 0 ${HISTORY_WIDTH} ${historyHeight}`}
          width={HISTORY_WIDTH}
          height={historyHeight}
          role="img"
          aria-labelledby={`${historyTitleId} ${historyDescriptionId}`}
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <title id={historyTitleId}>Histórico da falsa posição até a iteração {iterationLabel}</title>
          <desc id={historyDescriptionId}>
            {visibleHistory.length} intervalos no domínio inicial fixo. Os losangos mostram as estimativas produzidas pelas secantes.
          </desc>
          <rect width={HISTORY_WIDTH} height={historyHeight} fill={COLORS.background} />
          <text x={HISTORY_MARGIN.left} y="25" fill={COLORS.ink} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="12" fontWeight="500">
            INTERVALOS RETIDOS + TRAJETÓRIA DE cₙ
          </text>
          <text x={HISTORY_MARGIN.left} y="43" fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="9.5">
            domínio inicial fixo · compare posição e largura em cada passo
          </text>

          <line x1={historyScale(initialA)} x2={historyScale(initialB)} y1={HISTORY_MARGIN.top - 7} y2={HISTORY_MARGIN.top - 7} stroke={COLORS.axis} opacity="0.38" />
          <text x={historyScale(initialA)} y={HISTORY_MARGIN.top - 13} fill={COLORS.muted} fontFamily="IBM Plex Mono, monospace" fontSize="9.5">{formatNumber(initialA, 4)}</text>
          <text x={historyScale(initialB)} y={HISTORY_MARGIN.top - 13} fill={COLORS.muted} fontFamily="IBM Plex Mono, monospace" fontSize="9.5" textAnchor="end">{formatNumber(initialB, 4)}</text>

          {visibleHistory.length > 1 ? (
            <polyline points={estimatePolyline} fill="none" stroke={COLORS.estimate} strokeWidth="1.2" opacity="0.45" />
          ) : null}

          {visibleHistory.map((step, index) => {
            const y = HISTORY_MARGIN.top + index * historyGap;
            const retainedA = finite(step.nextA) ?? finite(step.a) ?? initialA;
            const retainedB = finite(step.nextB) ?? finite(step.b) ?? initialB;
            const leftX = historyScale(Math.min(retainedA, retainedB));
            const rightX = historyScale(Math.max(retainedA, retainedB));
            const estimateX = historyScale(finite(step.estimate) ?? step.a);
            const isCurrent = index === visibleHistory.length - 1;
            const showLabel = index % historyLabelStride === 0 || isCurrent;
            return (
              <g key={`${step.iteration}-${step.estimate}`} aria-hidden="true">
                {showLabel ? (
                  <text x={HISTORY_MARGIN.left - 10} y={y + 3.5} fill={isCurrent ? COLORS.secant : COLORS.muted} fontFamily="IBM Plex Mono, monospace" fontSize="9.5" textAnchor="end">
                    {step.iteration}
                  </text>
                ) : null}
                <line x1={leftX} x2={rightX} y1={y} y2={y} stroke={isCurrent ? COLORS.bracket : COLORS.axis} strokeWidth={isCurrent ? 4.5 : 3} opacity={isCurrent ? 0.94 : 0.5} />
                <circle cx={leftX} cy={y} r={isCurrent ? 3.6 : 2.7} fill={COLORS.bracket} />
                <rect x={rightX - 3} y={y - 3} width="6" height="6" fill={COLORS.bracket} />
                <rect
                  x={estimateX - (isCurrent ? 4 : 3)}
                  y={y - (isCurrent ? 4 : 3)}
                  width={isCurrent ? 8 : 6}
                  height={isCurrent ? 8 : 6}
                  fill={COLORS.estimate}
                  stroke={COLORS.background}
                  strokeWidth="1"
                  transform={`rotate(45 ${estimateX} ${y})`}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}

export default FalsePositionPlot;
