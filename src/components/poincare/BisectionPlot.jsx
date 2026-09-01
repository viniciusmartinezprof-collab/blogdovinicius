import { useId, useMemo } from "react";

const PLOT_WIDTH = 760;
const PLOT_HEIGHT = 420;
const PLOT_MARGIN = { top: 62, right: 24, bottom: 55, left: 66 };
const HISTORY_WIDTH = 760;
const HISTORY_MARGIN = { top: 58, right: 20, bottom: 18, left: 62 };
const HISTORY_ROW_HEIGHT = 27;
const HISTORY_STACK_HEIGHT = 150;
const MAX_PLOT_VALUE = Number.MAX_VALUE / 8;

const COLORS = {
  background: "#081a2a",
  backgroundRaised: "#0d2335",
  border: "#45657f",
  grid: "#8db0c9",
  ink: "#eaf4fc",
  muted: "#a9bfd0",
  curve: "#77bce6",
  interval: "#5bc0b5",
  midpoint: "#e5b85e",
  axis: "#b8cede",
};

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampPlotValue(value) {
  return clamp(value, -MAX_PLOT_VALUE, MAX_PLOT_VALUE);
}

function formatNumber(value, significantDigits = 6) {
  const number = toFiniteNumber(value);

  if (number === null) return "—";
  if (number === 0) return "0";

  const magnitude = Math.abs(number);

  if (magnitude >= 100000 || magnitude < 0.0001) {
    return number.toExponential(Math.max(1, significantDigits - 2));
  }

  return Number(number.toPrecision(significantDigits)).toString();
}

function safelyEvaluate(evaluate, x) {
  if (typeof evaluate !== "function") return null;

  try {
    return toFiniteNumber(evaluate(x));
  } catch {
    return null;
  }
}

function getXDomain(run) {
  const initialA = toFiniteNumber(run?.initialA);
  const initialB = toFiniteNumber(run?.initialB);
  const firstStep = Array.isArray(run?.iterations) ? run.iterations[0] : null;
  const fallbackA = toFiniteNumber(firstStep?.a);
  const fallbackB = toFiniteNumber(firstStep?.b);
  const a = initialA ?? fallbackA ?? -1;
  const b = initialB ?? fallbackB ?? 1;
  const lower = Math.min(a, b);
  const upper = Math.max(a, b);
  const span = upper - lower;
  const padding = span > 0 ? span * 0.08 : Math.max(Math.abs(lower) * 0.1, 1);

  return [lower - padding, upper + padding];
}

function sampleFunction(evaluate, xMinimum, xMaximum, sampleCount = 281) {
  const samples = [];
  const span = xMaximum - xMinimum;

  for (let index = 0; index < sampleCount; index += 1) {
    const x = xMinimum + (span * index) / (sampleCount - 1);
    samples.push({ x, y: safelyEvaluate(evaluate, x) });
  }

  return samples;
}

function percentile(sortedValues, position) {
  if (sortedValues.length === 0) return null;

  const index = (sortedValues.length - 1) * position;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

function getYDomain(samples, iterations) {
  const sampledValues = samples
    .map((sample) => sample.y)
    .filter((value) => value !== null)
    .map(clampPlotValue)
    .sort((left, right) => left - right);
  const iterationValues = iterations.flatMap((step) => [
    step?.fa ?? step?.fA,
    step?.fb ?? step?.fB,
    step?.fMidpoint,
  ])
    .map(toFiniteNumber)
    .filter((value) => value !== null)
    .map(clampPlotValue);

  let lower = percentile(sampledValues, 0.02);
  let upper = percentile(sampledValues, 0.98);

  if (lower === null || upper === null) {
    lower = iterationValues.length > 0 ? Math.min(...iterationValues) : -1;
    upper = iterationValues.length > 0 ? Math.max(...iterationValues) : 1;
  }

  lower = Math.min(lower, 0, ...iterationValues);
  upper = Math.max(upper, 0, ...iterationValues);

  if (lower === upper) {
    const expansion = Math.max(Math.abs(lower) * 0.2, 1);
    lower -= expansion;
    upper += expansion;
  }

  const padding = (upper - lower) * 0.1;
  return [lower - padding, upper + padding];
}

function niceStep(span, desiredTickCount) {
  const roughStep = span / Math.max(desiredTickCount, 1);
  const power = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / power;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * power;
}

function makeTicks(minimum, maximum, desiredTickCount) {
  const span = maximum - minimum;
  if (!(span > 0)) return [minimum];

  const step = niceStep(span, desiredTickCount);
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
  let previousValue = null;

  const flush = () => {
    if (commands.length > 1) paths.push(commands.join(" "));
    commands = [];
    previousValue = null;
  };

  samples.forEach(({ x, y }) => {
    if (y === null) {
      flush();
      return;
    }

    if (previousValue !== null && Math.abs(y - previousValue) > ySpan * 0.9) {
      flush();
    }

    const boundedY = clamp(y, yMinimum - ySpan * 0.2, yMaximum + ySpan * 0.2);
    const command = `${commands.length === 0 ? "M" : "L"} ${xScale(x).toFixed(2)} ${yScale(boundedY).toFixed(2)}`;
    commands.push(command);
    previousValue = y;
  });

  flush();
  return paths;
}

function PointMarker({ x, y, kind, label }) {
  const isNearTop = y < PLOT_MARGIN.top + 24;
  const labelY = isNearTop ? y + 21 : y - 11;
  const fill = kind === "midpoint" ? COLORS.midpoint : COLORS.interval;

  return (
    <g aria-hidden="true">
      {kind === "left" ? <circle cx={x} cy={y} r="4.8" fill={fill} stroke={COLORS.background} strokeWidth="2" /> : null}
      {kind === "midpoint" ? (
        <rect
          x={x - 4.4}
          y={y - 4.4}
          width="8.8"
          height="8.8"
          fill={fill}
          stroke={COLORS.background}
          strokeWidth="2"
          transform={`rotate(45 ${x} ${y})`}
        />
      ) : null}
      {kind === "right" ? (
        <rect x={x - 4.5} y={y - 4.5} width="9" height="9" fill={fill} stroke={COLORS.background} strokeWidth="2" />
      ) : null}
      <text
        x={x + (kind === "left" ? -7 : kind === "right" ? 7 : 0)}
        y={labelY}
        fill={fill}
        fontFamily="IBM Plex Mono, Courier New, monospace"
        fontSize="12"
        fontWeight="500"
        paintOrder="stroke"
        stroke={COLORS.background}
        strokeWidth="3"
        textAnchor={kind === "left" ? "end" : kind === "right" ? "start" : "middle"}
      >
        {label}
      </text>
    </g>
  );
}

function EmptyPlot({ titleId, descriptionId }) {
  const xAxisY = PLOT_HEIGHT / 2;
  const yAxisX = PLOT_WIDTH / 2;

  return (
    <svg
      viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
      width={PLOT_WIDTH}
      height={PLOT_HEIGHT}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <title id={titleId}>Gráfico do método da bisseção aguardando dados</title>
      <desc id={descriptionId}>Inicie uma simulação para visualizar a função e a redução do intervalo.</desc>
      <rect x="0.5" y="0.5" width={PLOT_WIDTH - 1} height={PLOT_HEIGHT - 1} rx="2" fill={COLORS.background} stroke={COLORS.border} />
      <line x1={PLOT_MARGIN.left} x2={PLOT_WIDTH - PLOT_MARGIN.right} y1={xAxisY} y2={xAxisY} stroke={COLORS.axis} opacity="0.45" />
      <line x1={yAxisX} x2={yAxisX} y1={PLOT_MARGIN.top} y2={PLOT_HEIGHT - PLOT_MARGIN.bottom} stroke={COLORS.axis} opacity="0.45" />
      <text
        x={PLOT_WIDTH / 2}
        y={PLOT_HEIGHT / 2 + 48}
        fill={COLORS.muted}
        fontFamily="IBM Plex Mono, Courier New, monospace"
        fontSize="15"
        textAnchor="middle"
      >
        Aguardando uma simulação
      </text>
    </svg>
  );
}

function BisectionPlot({ run, activeIndex }) {
  const generatedId = useId().replace(/:/g, "");
  const plotTitleId = `bisection-plot-title-${generatedId}`;
  const plotDescriptionId = `bisection-plot-description-${generatedId}`;
  const historyTitleId = `bisection-history-title-${generatedId}`;
  const historyDescriptionId = `bisection-history-description-${generatedId}`;
  const clipPathId = `bisection-plot-clip-${generatedId}`;
  const iterations = Array.isArray(run?.iterations) ? run.iterations : [];
  const requestedIndex = toFiniteNumber(activeIndex);
  const currentIndex = iterations.length > 0
    ? clamp(Math.trunc(requestedIndex ?? iterations.length - 1), 0, iterations.length - 1)
    : -1;
  const currentStep = currentIndex >= 0 ? iterations[currentIndex] : null;
  const [xMinimum, xMaximum] = getXDomain(run);
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
      <figure className="bisection-visualization" style={{ margin: 0 }}>
        <EmptyPlot titleId={plotTitleId} descriptionId={plotDescriptionId} />
      </figure>
    );
  }

  const plotRight = PLOT_WIDTH - PLOT_MARGIN.right;
  const plotBottom = PLOT_HEIGHT - PLOT_MARGIN.bottom;
  const plotInnerWidth = plotRight - PLOT_MARGIN.left;
  const plotInnerHeight = plotBottom - PLOT_MARGIN.top;
  const xScale = (value) => PLOT_MARGIN.left + ((value - xMinimum) / (xMaximum - xMinimum)) * plotInnerWidth;
  const yScale = (value) => plotBottom
    - ((clamp(value, yMinimum, yMaximum) - yMinimum) / (yMaximum - yMinimum)) * plotInnerHeight;
  const xTicks = makeTicks(xMinimum, xMaximum, 7);
  const yTicks = makeTicks(yMinimum, yMaximum, 6);
  const curvePaths = buildCurvePaths(samples, xScale, yScale, yMinimum, yMaximum);
  const a = toFiniteNumber(currentStep.a) ?? xMinimum;
  const b = toFiniteNumber(currentStep.b) ?? xMaximum;
  const midpoint = toFiniteNumber(currentStep.midpoint) ?? (a + b) / 2;
  const fa = toFiniteNumber(currentStep.fa ?? currentStep.fA) ?? safelyEvaluate(run?.evaluate, a);
  const fb = toFiniteNumber(currentStep.fb ?? currentStep.fB) ?? safelyEvaluate(run?.evaluate, b);
  const fMidpoint = toFiniteNumber(currentStep.fMidpoint) ?? safelyEvaluate(run?.evaluate, midpoint);
  const intervalLeft = Math.min(a, b);
  const intervalRight = Math.max(a, b);
  const intervalX = xScale(intervalLeft);
  const intervalWidth = Math.max(0.8, xScale(intervalRight) - intervalX);
  const xAxisY = yScale(0);
  const yAxisX = xMinimum <= 0 && xMaximum >= 0 ? xScale(0) : PLOT_MARGIN.left;
  const iterationLabel = currentStep.iteration ?? currentIndex;
  const expression = String(run?.expression || "f(x)");
  const visibleHistory = iterations.slice(0, currentIndex + 1);
  const historyRowGap = visibleHistory.length <= 1
    ? 0
    : Math.min(HISTORY_ROW_HEIGHT, HISTORY_STACK_HEIGHT / (visibleHistory.length - 1));
  const historyHeight = Math.max(
    100,
    HISTORY_MARGIN.top
      + Math.max(0, visibleHistory.length - 1) * historyRowGap
      + HISTORY_MARGIN.bottom,
  );
  const historyLabelStride = historyRowGap > 0
    ? Math.max(1, Math.ceil(14 / historyRowGap))
    : 1;
  const historyRight = HISTORY_WIDTH - HISTORY_MARGIN.right;
  const historyInnerWidth = historyRight - HISTORY_MARGIN.left;
  const historyXScale = (value) => HISTORY_MARGIN.left
    + ((value - xMinimum) / (xMaximum - xMinimum)) * historyInnerWidth;
  const initialA = toFiniteNumber(run?.initialA) ?? toFiniteNumber(iterations[0]?.a) ?? intervalLeft;
  const initialB = toFiniteNumber(run?.initialB) ?? toFiniteNumber(iterations[0]?.b) ?? intervalRight;
  const initialLeftX = historyXScale(Math.min(initialA, initialB));
  const initialRightX = historyXScale(Math.max(initialA, initialB));
  const markerValues = [
    { key: "a", label: "aₙ", value: a, functionValue: fa, kind: "left", color: COLORS.interval },
    { key: "m", label: "mₙ", value: midpoint, functionValue: fMidpoint, kind: "midpoint", color: COLORS.midpoint },
    { key: "b", label: "bₙ", value: b, functionValue: fb, kind: "right", color: COLORS.interval },
  ];

  return (
    <figure
      className="bisection-visualization"
      style={{ display: "grid", gap: "12px", margin: 0, minWidth: 0 }}
    >
      <svg
        className="bisection-plot"
        viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
        width={PLOT_WIDTH}
        height={PLOT_HEIGHT}
        role="img"
        aria-labelledby={`${plotTitleId} ${plotDescriptionId}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <title id={plotTitleId}>Método da bisseção, iteração {iterationLabel}</title>
        <desc id={plotDescriptionId}>
          Gráfico de {expression}. Na iteração {iterationLabel}, o intervalo vai de {formatNumber(a)} a {formatNumber(b)},
          com ponto médio {formatNumber(midpoint)} e largura b menos a igual a {formatNumber(currentStep.intervalWidth)}.
        </desc>
        <defs>
          <clipPath id={clipPathId}>
            <rect
              x={PLOT_MARGIN.left}
              y={PLOT_MARGIN.top}
              width={plotInnerWidth}
              height={plotInnerHeight}
            />
          </clipPath>
        </defs>

        <rect
          x="0.5"
          y="0.5"
          width={PLOT_WIDTH - 1}
          height={PLOT_HEIGHT - 1}
          rx="2"
          fill={COLORS.background}
          stroke={COLORS.border}
        />

        <g aria-hidden="true" fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="11.5">
          {markerValues.map((marker, index) => (
            <g key={marker.key} transform={`translate(${PLOT_MARGIN.left + index * 220} 25)`}>
              <rect x="0" y="-7" width="9" height="9" fill={marker.color} transform={marker.kind === "midpoint" ? "rotate(45 4.5 -2.5)" : undefined} />
              <text x="16" y="1" fill={COLORS.ink}>
                {marker.label} = {formatNumber(marker.value, 5)}
              </text>
            </g>
          ))}
          <text x={PLOT_MARGIN.left} y="48" fill={COLORS.muted}>
            iteração {iterationLabel} · b − a = {formatNumber(currentStep.intervalWidth, 5)} · Stop? {currentStep.stop ? "sim" : "não"}
          </text>
        </g>

        <g clipPath={`url(#${clipPathId})`} aria-hidden="true">
          <rect
            x={intervalX}
            y={PLOT_MARGIN.top}
            width={intervalWidth}
            height={plotInnerHeight}
            fill={COLORS.interval}
            opacity="0.13"
          />

          {xTicks.map((tick) => (
            <line
              key={`x-grid-${tick}`}
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={PLOT_MARGIN.top}
              y2={plotBottom}
              stroke={COLORS.grid}
              strokeWidth="1"
              opacity="0.16"
            />
          ))}
          {yTicks.map((tick) => (
            <line
              key={`y-grid-${tick}`}
              x1={PLOT_MARGIN.left}
              x2={plotRight}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke={COLORS.grid}
              strokeWidth="1"
              opacity="0.16"
            />
          ))}

          <line x1={PLOT_MARGIN.left} x2={plotRight} y1={xAxisY} y2={xAxisY} stroke={COLORS.axis} strokeWidth="1.2" opacity="0.75" />
          <line x1={yAxisX} x2={yAxisX} y1={PLOT_MARGIN.top} y2={plotBottom} stroke={COLORS.axis} strokeWidth="1.2" opacity="0.75" />

          {curvePaths.map((path, index) => (
            <path
              key={`curve-${index}`}
              d={path}
              fill="none"
              stroke={COLORS.curve}
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {markerValues.map((marker) => (
            <line
              key={`marker-line-${marker.key}`}
              x1={xScale(marker.value)}
              x2={xScale(marker.value)}
              y1={PLOT_MARGIN.top}
              y2={plotBottom}
              stroke={marker.color}
              strokeWidth={marker.kind === "midpoint" ? 1.8 : 1.35}
              strokeDasharray={marker.kind === "midpoint" ? "3 4" : "7 5"}
              opacity={marker.kind === "midpoint" ? 0.95 : 0.78}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {markerValues.map((marker) => marker.functionValue !== null ? (
            <PointMarker
              key={`marker-point-${marker.key}`}
              x={xScale(marker.value)}
              y={yScale(marker.functionValue)}
              kind={marker.kind}
              label={marker.label}
            />
          ) : null)}
        </g>

        <rect
          x={PLOT_MARGIN.left}
          y={PLOT_MARGIN.top}
          width={plotInnerWidth}
          height={plotInnerHeight}
          fill="none"
          stroke={COLORS.border}
          strokeWidth="1"
          aria-hidden="true"
        />

        <g aria-hidden="true" fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="10.5">
          {xTicks.map((tick) => (
            <text key={`x-label-${tick}`} x={xScale(tick)} y={plotBottom + 20} textAnchor="middle">
              {formatNumber(tick, 4)}
            </text>
          ))}
          {yTicks.map((tick) => (
            <text key={`y-label-${tick}`} x={PLOT_MARGIN.left - 9} y={yScale(tick) + 3.5} textAnchor="end">
              {formatNumber(tick, 4)}
            </text>
          ))}
          <text x={plotRight} y={plotBottom + 39} fill={COLORS.ink} textAnchor="end">x</text>
          <text x={PLOT_MARGIN.left - 9} y={PLOT_MARGIN.top - 8} fill={COLORS.ink} textAnchor="end">f(x)</text>
        </g>

        {curvePaths.length === 0 ? (
          <text
            x={(PLOT_MARGIN.left + plotRight) / 2}
            y={(PLOT_MARGIN.top + plotBottom) / 2}
            fill={COLORS.muted}
            fontFamily="IBM Plex Mono, Courier New, monospace"
            fontSize="13"
            textAnchor="middle"
          >
            Não foi possível representar f(x) neste intervalo.
          </text>
        ) : null}
      </svg>

      <div
        className="bisection-interval-history"
        style={{
          maxHeight: "230px",
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
          <title id={historyTitleId}>Histórico dos intervalos até a iteração {iterationLabel}</title>
          <desc id={historyDescriptionId}>
            {visibleHistory.length} intervalos empilhados no mesmo domínio inicial. O intervalo mais recente vai de {formatNumber(a)} a {formatNumber(b)}.
          </desc>
          <rect x="0" y="0" width={HISTORY_WIDTH} height={historyHeight} fill={COLORS.background} />
          <text
            x={HISTORY_MARGIN.left}
            y="25"
            fill={COLORS.ink}
            fontFamily="IBM Plex Mono, Courier New, monospace"
            fontSize="12"
            fontWeight="500"
          >
            INTERVALOS RETIDOS · DOMÍNIO INICIAL FIXO
          </text>

          <line
            x1={initialLeftX}
            x2={initialRightX}
            y1={HISTORY_MARGIN.top - 10}
            y2={HISTORY_MARGIN.top - 10}
            stroke={COLORS.axis}
            opacity="0.42"
          />
          <text x={initialLeftX} y={HISTORY_MARGIN.top - 16} fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="9.5" textAnchor="start">
            {formatNumber(initialA, 4)}
          </text>
          <text x={initialRightX} y={HISTORY_MARGIN.top - 16} fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="9.5" textAnchor="end">
            {formatNumber(initialB, 4)}
          </text>

          {visibleHistory.map((step, index) => {
            const stepA = toFiniteNumber(step?.a) ?? initialA;
            const stepB = toFiniteNumber(step?.b) ?? initialB;
            const stepMidpoint = toFiniteNumber(step?.midpoint) ?? (stepA + stepB) / 2;
            const leftX = historyXScale(Math.min(stepA, stepB));
            const rightX = historyXScale(Math.max(stepA, stepB));
            const midpointX = historyXScale(stepMidpoint);
            const y = HISTORY_MARGIN.top + index * historyRowGap;
            const isCurrent = index === visibleHistory.length - 1;
            const rowIteration = step?.iteration ?? index;
            const showLabel = index % historyLabelStride === 0 || isCurrent;
            const intervalStrokeWidth = isCurrent
              ? 6
              : clamp(historyRowGap * 0.28, 0.8, 4);

            return (
              <g key={`history-${rowIteration}-${index}`}>
                <title>
                  Iteração {rowIteration}: intervalo de {formatNumber(stepA)} a {formatNumber(stepB)}, ponto médio {formatNumber(stepMidpoint)}.
                </title>
                {isCurrent && historyRowGap >= 8 ? (
                  <rect
                    x="1"
                    y={y - historyRowGap / 2}
                    width={HISTORY_WIDTH - 2}
                    height={historyRowGap}
                    fill={COLORS.backgroundRaised}
                  />
                ) : null}
                {showLabel ? (
                  <text
                    x={HISTORY_MARGIN.left - 10}
                    y={y + 3.5}
                    fill={isCurrent ? COLORS.ink : COLORS.muted}
                    fontFamily="IBM Plex Mono, Courier New, monospace"
                    fontSize="10.5"
                    textAnchor="end"
                  >
                    i={rowIteration}
                  </text>
                ) : null}
                <line
                  x1={initialLeftX}
                  x2={initialRightX}
                  y1={y}
                  y2={y}
                  stroke={COLORS.axis}
                  strokeWidth="1"
                  opacity="0.18"
                />
                <line
                  x1={leftX}
                  x2={rightX}
                  y1={y}
                  y2={y}
                  stroke={COLORS.interval}
                  strokeWidth={intervalStrokeWidth}
                  strokeLinecap="square"
                  opacity={isCurrent ? 1 : 0.68}
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={leftX} cy={y} r={isCurrent ? 3.5 : 2.8} fill={COLORS.interval} />
                <rect x={rightX - 3} y={y - 3} width="6" height="6" fill={COLORS.interval} />
                {historyRowGap >= 4 || isCurrent ? (
                  <rect
                    x={midpointX - 2.8}
                    y={y - 2.8}
                    width="5.6"
                    height="5.6"
                    fill={COLORS.midpoint}
                    transform={`rotate(45 ${midpointX} ${y})`}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}

export default BisectionPlot;
