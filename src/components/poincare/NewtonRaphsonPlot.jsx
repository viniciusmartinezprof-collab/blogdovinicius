import { useId, useMemo } from "react";

const WIDTH = 780;
const HEIGHT = 455;
const MARGIN = { top: 70, right: 28, bottom: 58, left: 68 };
const HISTORY_HEIGHT = 205;
const HISTORY_MARGIN = { top: 55, right: 28, bottom: 43, left: 68 };
const MAX_PLOT_VALUE = 1e120;

const COLORS = {
  background: "#081a2a",
  border: "#45657f",
  grid: "#8db0c9",
  ink: "#eaf4fc",
  muted: "#9fb8ca",
  curve: "#77bce6",
  tangent: "#e5b85e",
  current: "#5bc0b5",
  next: "#f2a36f",
  residual: "#6fc7b8",
  tolerance: "#dc867b",
  axis: "#b8cede",
};

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function bounded(value) {
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

function trajectoryValues(run, iterations) {
  const values = [finite(run?.initialX)];
  iterations.forEach((step) => {
    values.push(finite(step?.xCurrent), finite(step?.xNext));
  });
  values.push(finite(run?.root));
  return values.filter((value) => value !== null).map(bounded);
}

function getXDomain(run, iterations) {
  const values = trajectoryValues(run, iterations);
  if (!values.length) return [-1.2, 1.2];

  let minimum = Math.min(...values);
  let maximum = Math.max(...values);

  if (!(maximum > minimum)) {
    const center = minimum;
    const span = Math.max(2, Math.abs(center) * 0.5);
    minimum = center - span * 0.6;
    maximum = center + span * 0.6;
  } else {
    const center = (minimum + maximum) / 2;
    const trajectorySpan = maximum - minimum;
    const contextualSpan = Math.max(1, Math.abs(center) * 0.8);
    const span = Math.max(trajectorySpan * 1.26, contextualSpan);
    minimum = center - span / 2;
    maximum = center + span / 2;
  }

  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || !(maximum > minimum)) {
    return [-1.2, 1.2];
  }
  return [minimum, maximum];
}

function sampleFunction(evaluate, minimum, maximum, count = 321) {
  const samples = [];
  const span = maximum - minimum;

  if (typeof evaluate !== "function" || !Number.isFinite(span) || !(span > 0)) return samples;

  for (let index = 0; index < count; index += 1) {
    const x = minimum + (span * index) / (count - 1);
    samples.push({ x, y: safelyEvaluate(evaluate, x) });
  }
  return samples;
}

function percentile(sortedValues, fraction) {
  if (!sortedValues.length) return null;
  const position = (sortedValues.length - 1) * fraction;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const weight = position - lowerIndex;
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

function getYDomain(samples, iterations, run) {
  const sampledValues = samples
    .map(({ y }) => y)
    .filter((value) => value !== null)
    .map(bounded)
    .sort((left, right) => left - right);
  const stepValues = iterations
    .flatMap((step) => [step?.fCurrent, step?.fNext])
    .map(finite)
    .filter((value) => value !== null)
    .map(bounded);
  const resultValue = finite(run?.fRoot);
  if (resultValue !== null) stepValues.push(bounded(resultValue));

  let minimum = percentile(sampledValues, 0.025);
  let maximum = percentile(sampledValues, 0.975);

  if (minimum === null || maximum === null) {
    minimum = stepValues.length ? Math.min(...stepValues) : -1;
    maximum = stepValues.length ? Math.max(...stepValues) : 1;
  }

  minimum = Math.min(minimum, 0, ...stepValues);
  maximum = Math.max(maximum, 0, ...stepValues);

  if (!(maximum > minimum)) {
    const expansion = Math.max(Math.abs(minimum) * 0.2, 1);
    minimum -= expansion;
    maximum += expansion;
  }

  const padding = (maximum - minimum) * 0.1;
  return [minimum - padding, maximum + padding];
}

function niceStep(span, desiredCount) {
  if (!Number.isFinite(span) || !(span > 0)) return null;
  const roughStep = span / Math.max(desiredCount, 1);
  const power = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / power;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = multiplier * power;
  return Number.isFinite(step) && step > 0 ? step : null;
}

function makeTicks(minimum, maximum, desiredCount = 7) {
  const step = niceStep(maximum - minimum, desiredCount);
  if (step === null) return [minimum, maximum];

  const first = Math.ceil(minimum / step) * step;
  const estimatedCount = Math.floor((maximum - first) / step) + 1;
  if (!Number.isFinite(first) || estimatedCount < 1 || estimatedCount > 30) {
    return Array.from({ length: desiredCount + 1 }, (_, index) => (
      minimum + ((maximum - minimum) * index) / desiredCount
    ));
  }

  return Array.from({ length: estimatedCount }, (_, index) => {
    const tick = first + index * step;
    return Math.abs(tick) < step * 1e-10 ? 0 : tick;
  });
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
    if (
      y === null
      || y < yMinimum - ySpan * 0.2
      || y > yMaximum + ySpan * 0.2
      || (previousY !== null && Math.abs(y - previousY) > ySpan * 0.85)
    ) {
      flush();
      if (y === null || y < yMinimum - ySpan * 0.2 || y > yMaximum + ySpan * 0.2) return;
    }

    commands.push(`${commands.length ? "L" : "M"} ${xScale(x).toFixed(2)} ${yScale(y).toFixed(2)}`);
    previousY = y;
  });

  flush();
  return paths;
}

function tangentSegment(xCurrent, fCurrent, derivative, xMinimum, xMaximum, yMinimum, yMaximum) {
  if (xCurrent === null || fCurrent === null || derivative === null) return null;
  if (derivative === 0) {
    return fCurrent >= yMinimum && fCurrent <= yMaximum
      ? [{ x: xMinimum, y: fCurrent }, { x: xMaximum, y: fCurrent }]
      : null;
  }

  const candidates = [];
  const addCandidate = (x, y) => {
    if (
      Number.isFinite(x)
      && Number.isFinite(y)
      && x >= xMinimum
      && x <= xMaximum
      && y >= yMinimum
      && y <= yMaximum
      && !candidates.some((point) => Math.abs(point.x - x) <= (xMaximum - xMinimum) * 1e-10)
    ) {
      candidates.push({ x, y });
    }
  };

  addCandidate(xMinimum, fCurrent + derivative * (xMinimum - xCurrent));
  addCandidate(xMaximum, fCurrent + derivative * (xMaximum - xCurrent));
  addCandidate(xCurrent + (yMinimum - fCurrent) / derivative, yMinimum);
  addCandidate(xCurrent + (yMaximum - fCurrent) / derivative, yMaximum);

  if (candidates.length < 2) return null;
  candidates.sort((left, right) => left.x - right.x);
  return [candidates[0], candidates[candidates.length - 1]];
}

function residualHistory(run, iterations) {
  const points = [];
  const firstStep = iterations[0];
  const initialX = finite(run?.initialX) ?? finite(firstStep?.xCurrent) ?? finite(run?.root);
  const initialValue = finite(firstStep?.fCurrent)
    ?? (iterations.length === 0 ? finite(run?.fRoot) : null)
    ?? safelyEvaluate(run?.evaluate, initialX);

  if (initialValue !== null) {
    points.push({ iteration: 0, x: initialX, residual: Math.abs(initialValue) });
  }

  iterations.forEach((step, index) => {
    const fNext = finite(step?.fNext);
    if (fNext === null) return;
    points.push({
      iteration: finite(step?.iteration) ?? index + 1,
      x: finite(step?.xNext),
      residual: Math.abs(fNext),
    });
  });

  if (!points.length) {
    const finalValue = finite(run?.fRoot);
    if (finalValue !== null) {
      points.push({ iteration: iterations.length, x: finite(run?.root), residual: Math.abs(finalValue) });
    }
  }
  return points;
}

function logFloor(points, tolerance) {
  const positiveValues = points.map(({ residual }) => residual).filter((value) => value > 0);
  if (tolerance !== null && tolerance > 0) positiveValues.push(tolerance);
  const reference = positiveValues.length ? Math.min(...positiveValues) : 1e-12;
  return Math.max(1e-300, reference * 0.1);
}

function getLogDomain(points, tolerance, floor) {
  const values = points.map(({ residual }) => Math.log10(Math.max(residual, floor)));
  if (tolerance !== null && tolerance > 0) values.push(Math.log10(Math.max(tolerance, floor)));
  if (!values.length) return [-12, 0];

  let minimum = Math.min(...values);
  let maximum = Math.max(...values);
  if (!(maximum > minimum)) {
    minimum -= 1;
    maximum += 1;
  } else {
    const padding = Math.max((maximum - minimum) * 0.12, 0.25);
    minimum -= padding;
    maximum += padding;
  }
  return [minimum, maximum];
}

function formatLogTick(exponent) {
  if (Math.abs(exponent - Math.round(exponent)) < 1e-8) return `1e${Math.round(exponent)}`;
  return `10^${formatNumber(exponent, 3)}`;
}

function EmptyPlot({ titleId, descriptionId }) {
  return (
    <svg
      className="newton-plot bisection-plot"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <title id={titleId}>Gráfico do método de Newton-Raphson aguardando dados</title>
      <desc id={descriptionId}>Execute uma simulação para visualizar a função, a tangente e a próxima aproximação.</desc>
      <rect x="0.5" y="0.5" width={WIDTH - 1} height={HEIGHT - 1} fill={COLORS.background} stroke={COLORS.border} />
      <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={HEIGHT / 2} y2={HEIGHT / 2} stroke={COLORS.axis} opacity="0.42" />
      <line x1={WIDTH / 2} x2={WIDTH / 2} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} stroke={COLORS.axis} opacity="0.42" />
      <text x={WIDTH / 2} y={HEIGHT / 2 + 46} fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="14" textAnchor="middle">
        Aguardando uma simulação
      </text>
    </svg>
  );
}

function NewtonRaphsonPlot({ run, activeIndex }) {
  const generatedId = useId().replace(/:/g, "");
  const plotTitleId = `newton-plot-title-${generatedId}`;
  const plotDescriptionId = `newton-plot-description-${generatedId}`;
  const historyTitleId = `newton-history-title-${generatedId}`;
  const historyDescriptionId = `newton-history-description-${generatedId}`;
  const clipId = `newton-plot-clip-${generatedId}`;
  const historyClipId = `newton-history-clip-${generatedId}`;
  const iterations = Array.isArray(run?.iterations) ? run.iterations : [];
  const requestedIndex = finite(activeIndex);
  const currentIndex = iterations.length
    ? clamp(Math.trunc(requestedIndex ?? iterations.length - 1), 0, iterations.length - 1)
    : -1;
  const visibleIterations = currentIndex >= 0 ? iterations.slice(0, currentIndex + 1) : [];
  const currentStep = currentIndex >= 0 ? iterations[currentIndex] : null;
  const [xMinimum, xMaximum] = useMemo(
    () => getXDomain(run, visibleIterations),
    [run, visibleIterations],
  );
  const samples = useMemo(
    () => sampleFunction(run?.evaluate, xMinimum, xMaximum),
    [run?.evaluate, xMinimum, xMaximum],
  );
  const [yMinimum, yMaximum] = useMemo(
    () => getYDomain(samples, visibleIterations, run),
    [samples, visibleIterations, run],
  );
  const fullResiduals = useMemo(
    () => residualHistory(run, iterations),
    [run, iterations],
  );
  const visibleResiduals = useMemo(
    () => residualHistory(run, visibleIterations),
    [run, visibleIterations],
  );

  if (!run) {
    return (
      <figure className="newton-visualization bisection-visualization" style={{ margin: 0 }}>
        <EmptyPlot titleId={plotTitleId} descriptionId={plotDescriptionId} />
      </figure>
    );
  }

  const plotRight = WIDTH - MARGIN.right;
  const plotBottom = HEIGHT - MARGIN.bottom;
  const innerWidth = plotRight - MARGIN.left;
  const innerHeight = plotBottom - MARGIN.top;
  const xScale = (value) => MARGIN.left + ((bounded(value) - xMinimum) / (xMaximum - xMinimum)) * innerWidth;
  const yScale = (value) => plotBottom - ((clamp(bounded(value), yMinimum, yMaximum) - yMinimum) / (yMaximum - yMinimum)) * innerHeight;
  const xTicks = makeTicks(xMinimum, xMaximum, 7);
  const yTicks = makeTicks(yMinimum, yMaximum, 6);
  const curvePaths = buildCurvePaths(samples, xScale, yScale, yMinimum, yMaximum);
  const xAxisY = yScale(0);
  const yAxisX = xMinimum <= 0 && xMaximum >= 0 ? xScale(0) : MARGIN.left;
  const xCurrent = finite(currentStep?.xCurrent)
    ?? finite(run?.initialX)
    ?? finite(run?.root)
    ?? 0;
  const fCurrent = finite(currentStep?.fCurrent)
    ?? finite(run?.fRoot)
    ?? safelyEvaluate(run?.evaluate, xCurrent);
  const derivative = finite(currentStep?.derivativeEstimate);
  const xNext = finite(currentStep?.xNext);
  const fNext = finite(currentStep?.fNext);
  const tangent = tangentSegment(
    bounded(xCurrent),
    fCurrent === null ? null : bounded(fCurrent),
    derivative,
    xMinimum,
    xMaximum,
    yMinimum,
    yMaximum,
  );
  const iterationLabel = finite(currentStep?.iteration) ?? (currentIndex >= 0 ? currentIndex + 1 : 0);
  const pointLabel = currentStep ? "xₙ" : "x₀";
  const expression = String(run?.expression || "f(x)");
  const hasIntercept = xNext !== null;

  const historyRight = WIDTH - HISTORY_MARGIN.right;
  const historyBottom = HISTORY_HEIGHT - HISTORY_MARGIN.bottom;
  const historyInnerWidth = historyRight - HISTORY_MARGIN.left;
  const historyInnerHeight = historyBottom - HISTORY_MARGIN.top;
  const tolerance = finite(run?.tolerance);
  const floor = logFloor(fullResiduals, tolerance);
  const [historyMinimum, historyMaximum] = getLogDomain(fullResiduals, tolerance, floor);
  const historyTicks = makeTicks(historyMinimum, historyMaximum, 4);
  const historySlots = Math.max(1, fullResiduals.length - 1);
  const historyXScale = (index) => HISTORY_MARGIN.left + (index / historySlots) * historyInnerWidth;
  const historyYScale = (residual) => historyBottom
    - ((Math.log10(Math.max(residual, floor)) - historyMinimum) / (historyMaximum - historyMinimum)) * historyInnerHeight;
  const historyPath = visibleResiduals.map((point, index) => (
    `${index ? "L" : "M"} ${historyXScale(index).toFixed(2)} ${historyYScale(point.residual).toFixed(2)}`
  )).join(" ");
  const labelStride = Math.max(1, Math.ceil(fullResiduals.length / 10));
  const toleranceY = tolerance !== null && tolerance > 0 ? historyYScale(tolerance) : null;

  return (
    <figure
      className="newton-visualization bisection-visualization"
      style={{ display: "grid", gap: "12px", margin: 0, minWidth: 0 }}
    >
      <svg
        className="newton-plot bisection-plot"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-labelledby={`${plotTitleId} ${plotDescriptionId}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <title id={plotTitleId}>
          {currentStep ? `Newton-Raphson, iteração ${iterationLabel}` : "Newton-Raphson no chute inicial"}
        </title>
        <desc id={plotDescriptionId}>
          Gráfico de {expression}. O ponto atual é x igual a {formatNumber(xCurrent)}, com f de x igual a {formatNumber(fCurrent)}.
          {hasIntercept
            ? ` A tangente cruza o eixo x na próxima aproximação, ${formatNumber(xNext)}.`
            : " Esta etapa não produziu uma nova aproximação no eixo x."}
        </desc>
        <defs>
          <clipPath id={clipId}>
            <rect x={MARGIN.left} y={MARGIN.top} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        <rect x="0.5" y="0.5" width={WIDTH - 1} height={HEIGHT - 1} fill={COLORS.background} stroke={COLORS.border} />

        <g aria-hidden="true" fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="11.5">
          <line x1={MARGIN.left} x2={MARGIN.left + 25} y1="24" y2="24" stroke={COLORS.curve} strokeWidth="3" />
          <text x={MARGIN.left + 34} y="28" fill={COLORS.ink}>f(x)</text>
          <line x1={MARGIN.left + 112} x2={MARGIN.left + 137} y1="24" y2="24" stroke={COLORS.tangent} strokeWidth="2.7" />
          <text x={MARGIN.left + 146} y="28" fill={COLORS.ink}>tangente em xₙ</text>
          <rect x={MARGIN.left + 287} y="19.5" width="9" height="9" fill={COLORS.next} transform={`rotate(45 ${MARGIN.left + 291.5} 24)`} />
          <text x={MARGIN.left + 305} y="28" fill={COLORS.ink}>xₙ₊₁</text>
          <text x={MARGIN.left} y="51" fill={COLORS.muted} fontSize="11">
            i={iterationLabel} · {pointLabel}={formatNumber(xCurrent, 7)} · |f({pointLabel})|={formatNumber(fCurrent === null ? null : Math.abs(fCurrent), 5)} · |Δx|={formatNumber(currentStep?.stepError, 5)}
          </text>
        </g>

        <g clipPath={`url(#${clipId})`} aria-hidden="true">
          {xTicks.map((tick, index) => (
            <line key={`x-grid-${index}`} x1={xScale(tick)} x2={xScale(tick)} y1={MARGIN.top} y2={plotBottom} stroke={COLORS.grid} opacity="0.15" />
          ))}
          {yTicks.map((tick, index) => (
            <line key={`y-grid-${index}`} x1={MARGIN.left} x2={plotRight} y1={yScale(tick)} y2={yScale(tick)} stroke={COLORS.grid} opacity="0.15" />
          ))}

          <line x1={MARGIN.left} x2={plotRight} y1={xAxisY} y2={xAxisY} stroke={COLORS.axis} strokeWidth="1.2" opacity="0.78" />
          <line x1={yAxisX} x2={yAxisX} y1={MARGIN.top} y2={plotBottom} stroke={COLORS.axis} strokeWidth="1.2" opacity="0.72" />

          {curvePaths.map((path, index) => (
            <path key={`curve-${index}`} d={path} fill="none" stroke={COLORS.curve} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}

          {tangent ? (
            <line
              x1={xScale(tangent[0].x)}
              y1={yScale(tangent[0].y)}
              x2={xScale(tangent[1].x)}
              y2={yScale(tangent[1].y)}
              stroke={COLORS.tangent}
              strokeWidth="2.6"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {fCurrent !== null ? (
            <>
              <line x1={xScale(xCurrent)} x2={xScale(xCurrent)} y1={xAxisY} y2={yScale(fCurrent)} stroke={COLORS.current} strokeDasharray="5 5" opacity="0.72" />
              <circle cx={xScale(xCurrent)} cy={yScale(fCurrent)} r="5.4" fill={COLORS.current} stroke={COLORS.background} strokeWidth="2">
                <title>{pointLabel} = {formatNumber(xCurrent, 10)}; f({pointLabel}) = {formatNumber(fCurrent, 10)}</title>
              </circle>
              <text
                x={xScale(xCurrent) + 8}
                y={yScale(fCurrent) > MARGIN.top + 27 ? yScale(fCurrent) - 11 : yScale(fCurrent) + 22}
                fill={COLORS.current}
                fontFamily="IBM Plex Mono, Courier New, monospace"
                fontSize="12"
                fontWeight="600"
                paintOrder="stroke"
                stroke={COLORS.background}
                strokeWidth="3"
              >
                {pointLabel}
              </text>
            </>
          ) : null}

          {hasIntercept ? (
            <>
              <rect
                x={xScale(xNext) - 5}
                y={xAxisY - 5}
                width="10"
                height="10"
                fill={COLORS.next}
                stroke={COLORS.background}
                strokeWidth="2"
                transform={`rotate(45 ${xScale(xNext)} ${xAxisY})`}
              >
                <title>xₙ₊₁ = {formatNumber(xNext, 10)}</title>
              </rect>
              <text
                x={xScale(xNext)}
                y={xAxisY > MARGIN.top + 30 ? xAxisY - 14 : xAxisY + 26}
                fill={COLORS.next}
                fontFamily="IBM Plex Mono, Courier New, monospace"
                fontSize="12"
                fontWeight="600"
                paintOrder="stroke"
                stroke={COLORS.background}
                strokeWidth="3"
                textAnchor="middle"
              >
                xₙ₊₁
              </text>
            </>
          ) : null}

          {xNext !== null && fNext !== null ? (
            <circle cx={xScale(xNext)} cy={yScale(fNext)} r="3.8" fill={COLORS.curve} stroke={COLORS.background} strokeWidth="1.8">
              <title>f(xₙ₊₁) = {formatNumber(fNext, 10)}</title>
            </circle>
          ) : null}
        </g>

        <rect x={MARGIN.left} y={MARGIN.top} width={innerWidth} height={innerHeight} fill="none" stroke={COLORS.border} aria-hidden="true" />
        <g aria-hidden="true" fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="10.5">
          {xTicks.map((tick, index) => (
            <text key={`x-label-${index}`} x={xScale(tick)} y={plotBottom + 20} textAnchor="middle">{formatNumber(tick, 4)}</text>
          ))}
          {yTicks.map((tick, index) => (
            <text key={`y-label-${index}`} x={MARGIN.left - 9} y={yScale(tick) + 3.5} textAnchor="end">{formatNumber(tick, 4)}</text>
          ))}
          <text x={plotRight} y={plotBottom + 40} fill={COLORS.ink} textAnchor="end">x</text>
          <text x={MARGIN.left - 9} y={MARGIN.top - 8} fill={COLORS.ink} textAnchor="end">f(x)</text>
        </g>

        {!curvePaths.length ? (
          <text x={(MARGIN.left + plotRight) / 2} y={(MARGIN.top + plotBottom) / 2} fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="13" textAnchor="middle">
            Não foi possível representar f(x) neste domínio.
          </text>
        ) : null}
      </svg>

      <div
        className="newton-residual-history bisection-interval-history"
        style={{ border: `1px solid ${COLORS.border}`, borderRadius: "2px", background: COLORS.background, overflow: "hidden" }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HISTORY_HEIGHT}`}
          width={WIDTH}
          height={HISTORY_HEIGHT}
          role="img"
          aria-labelledby={`${historyTitleId} ${historyDescriptionId}`}
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <title id={historyTitleId}>Histórico logarítmico do resíduo até a iteração {iterationLabel}</title>
          <desc id={historyDescriptionId}>
            {visibleResiduals.length
              ? `${visibleResiduals.length} valores de módulo de f de x, de ${formatNumber(visibleResiduals[0].residual)} até ${formatNumber(visibleResiduals.at(-1).residual)}.`
              : "Não há valores de resíduo disponíveis para esta simulação."}
          </desc>
          <defs>
            <clipPath id={historyClipId}>
              <rect x={HISTORY_MARGIN.left} y={HISTORY_MARGIN.top} width={historyInnerWidth} height={historyInnerHeight} />
            </clipPath>
          </defs>
          <rect width={WIDTH} height={HISTORY_HEIGHT} fill={COLORS.background} />
          <text x={HISTORY_MARGIN.left} y="25" fill={COLORS.ink} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="12" fontWeight="500">
            QUEDA DO RESÍDUO · ESCALA LOG₁₀
          </text>
          <text x={HISTORY_MARGIN.left} y="42" fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="9.5">
            |f(xₙ)| por iteração {tolerance !== null && tolerance > 0 ? `· tolerância ${formatNumber(tolerance, 4)}` : ""}
          </text>

          <g clipPath={`url(#${historyClipId})`} aria-hidden="true">
            {historyTicks.map((tick, index) => (
              <line key={`history-grid-${index}`} x1={HISTORY_MARGIN.left} x2={historyRight} y1={historyBottom - ((tick - historyMinimum) / (historyMaximum - historyMinimum)) * historyInnerHeight} y2={historyBottom - ((tick - historyMinimum) / (historyMaximum - historyMinimum)) * historyInnerHeight} stroke={COLORS.grid} opacity="0.15" />
            ))}
            {toleranceY !== null ? (
              <line x1={HISTORY_MARGIN.left} x2={historyRight} y1={toleranceY} y2={toleranceY} stroke={COLORS.tolerance} strokeWidth="1.5" strokeDasharray="6 5" opacity="0.82" />
            ) : null}
            {visibleResiduals.length > 1 ? (
              <path d={historyPath} fill="none" stroke={COLORS.residual} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            ) : null}
            {visibleResiduals.map((point, index) => (
              <circle
                key={`residual-${point.iteration}-${index}`}
                cx={historyXScale(index)}
                cy={historyYScale(point.residual)}
                r={index === visibleResiduals.length - 1 ? 5 : 3.4}
                fill={index === visibleResiduals.length - 1 ? COLORS.next : COLORS.residual}
                stroke={COLORS.background}
                strokeWidth="1.5"
              >
                <title>n = {point.iteration}; |f(xₙ)| = {formatNumber(point.residual, 10)}; xₙ = {formatNumber(point.x, 10)}</title>
              </circle>
            ))}
          </g>

          <rect x={HISTORY_MARGIN.left} y={HISTORY_MARGIN.top} width={historyInnerWidth} height={historyInnerHeight} fill="none" stroke={COLORS.border} aria-hidden="true" />
          <g aria-hidden="true" fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="9.5">
            {historyTicks.map((tick, index) => {
              const y = historyBottom - ((tick - historyMinimum) / (historyMaximum - historyMinimum)) * historyInnerHeight;
              return <text key={`history-label-${index}`} x={HISTORY_MARGIN.left - 9} y={y + 3.5} textAnchor="end">{formatLogTick(tick)}</text>;
            })}
            {visibleResiduals.map((point, index) => (
              index % labelStride === 0 || index === visibleResiduals.length - 1 ? (
                <text key={`iteration-label-${point.iteration}-${index}`} x={historyXScale(index)} y={historyBottom + 18} fill={index === visibleResiduals.length - 1 ? COLORS.next : COLORS.muted} textAnchor="middle">
                  {point.iteration}
                </text>
              ) : null
            ))}
            <text x={historyRight} y={HISTORY_HEIGHT - 9} textAnchor="end">iteração n</text>
            {toleranceY !== null ? <text x={historyRight - 4} y={toleranceY - 5} fill={COLORS.tolerance} textAnchor="end">ε</text> : null}
          </g>

          {!visibleResiduals.length ? (
            <text x={(HISTORY_MARGIN.left + historyRight) / 2} y={(HISTORY_MARGIN.top + historyBottom) / 2 + 5} fill={COLORS.muted} fontFamily="IBM Plex Mono, Courier New, monospace" fontSize="12" textAnchor="middle">
              Resíduo indisponível
            </text>
          ) : null}
        </svg>
      </div>
    </figure>
  );
}

export default NewtonRaphsonPlot;
