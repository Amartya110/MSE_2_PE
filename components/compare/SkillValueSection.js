import PropTypes from 'prop-types';

const CHART_WIDTH = 620;
const CHART_HEIGHT = 220;
const CHART_PADDING = 28;
const SERIES_COLORS = ['#0000CC', '#008000'];

const format = (value, suffix = '') =>
  Number.isFinite(value) ? `${Number(value).toFixed(1)}${suffix}` : 'N/A';

const scalePoints = (history, minRating, maxRating) =>
  history.map((contest, index) => {
    const x =
      CHART_PADDING +
      (history.length <= 1
        ? (CHART_WIDTH - CHART_PADDING * 2) / 2
        : (index / (history.length - 1)) * (CHART_WIDTH - CHART_PADDING * 2));
    const range = maxRating - minRating || 1;
    const y =
      CHART_HEIGHT -
      CHART_PADDING -
      ((contest.rating - minRating) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
    return { ...contest, x, y };
  });

const RatingHistoryChart = ({ histories, handles }) => {
  const allRatings = histories.flat().map((contest) => contest.rating);
  if (!allRatings.length) return <p className="cf-muted">Contest rating history is unavailable.</p>;
  const min = Math.min(...allRatings);
  const max = Math.max(...allRatings);
  const lines = histories.map((history) => scalePoints(history, min, max));
  const gridY = [0, 1, 2, 3].map(
    (step) =>
      CHART_PADDING +
      (step / 3) * (CHART_HEIGHT - CHART_PADDING * 2),
  );
  return (
    <svg
      className="cf-compare-chart"
      role="img"
      aria-label="Cumulative contest rating over time"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
    >
      {gridY.map((y) => (
        <line className="cf-chart-gridline" key={y} x1={CHART_PADDING} x2={CHART_WIDTH - CHART_PADDING} y1={y} y2={y} />
      ))}
      {lines.map((points, userIndex) => (
        <g key={handles[userIndex]}>
          {points.length > 1 && (
            <polygon
              fill={SERIES_COLORS[userIndex]}
              fillOpacity="0.08"
              points={`${points[0].x},${CHART_HEIGHT - CHART_PADDING} ${points.map((point) => `${point.x},${point.y}`).join(' ')} ${points.at(-1).x},${CHART_HEIGHT - CHART_PADDING}`}
            />
          )}
          {points.length > 1 && (
            <polyline
              fill="none"
              points={points.map((point) => `${point.x},${point.y}`).join(' ')}
              stroke={SERIES_COLORS[userIndex]}
              strokeWidth="2"
            />
          )}
          {points.map((point, index) => (
            <circle
              cx={point.x}
              cy={point.y}
              fill={SERIES_COLORS[userIndex]}
              key={`${point.contestId ?? index}-${point.date ?? index}`}
              r="3"
            >
              <title>
                {point.date ?? 'Date unavailable'} · {point.contestName} · {handles[userIndex]}: {point.rating}
              </title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
};

RatingHistoryChart.propTypes = {
  histories: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.object)).isRequired,
  handles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

const RatingChangeChart = ({ histories, handles }) => {
  const changes = histories.map((history) =>
    history.filter((contest) => Number.isFinite(contest.ratingChange)),
  );
  const allChanges = changes.flat().map((contest) => contest.ratingChange);
  if (!allChanges.length) return <p className="cf-muted">Contest-by-contest rating changes are unavailable.</p>;
  const maxMagnitude = Math.max(1, ...allChanges.map(Math.abs));
  const baseline = CHART_HEIGHT / 2;
  const step = (CHART_WIDTH - CHART_PADDING * 2) / Math.max(1, ...changes.map((items) => items.length));
  const barWidth = Math.max(3, Math.min(12, step / 3));
  return (
    <svg
      className="cf-compare-chart"
      role="img"
      aria-label="Contest-by-contest rating change bars"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
    >
      <line className="cf-chart-gridline" x1={CHART_PADDING} x2={CHART_WIDTH - CHART_PADDING} y1={baseline} y2={baseline} />
      {changes.flatMap((history, userIndex) =>
        history.map((contest, index) => {
          const height = (Math.abs(contest.ratingChange) / maxMagnitude) * (baseline - 16);
          const x =
            CHART_PADDING +
            index * step +
            (userIndex === 0 ? step * 0.1 : step * 0.55);
          const y = contest.ratingChange >= 0 ? baseline - height : baseline;
          return (
            <rect
              fill={SERIES_COLORS[userIndex]}
              height={height}
              key={`${handles[userIndex]}-${contest.contestId}-${index}`}
              width={barWidth}
              x={x}
              y={y}
            >
              <title>
                {contest.date ?? 'Date unavailable'} · {contest.contestName} · {handles[userIndex]}: {contest.ratingChange > 0 ? '+' : ''}{contest.ratingChange}
              </title>
            </rect>
          );
        }),
      )}
    </svg>
  );
};

RatingChangeChart.propTypes = RatingHistoryChart.propTypes;

const radarPoint = (index, value, total, radius, center) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  const distance = radius * ((value ?? 0) / 100);
  return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
};

const SkillRadarChart = ({ radar, handles }) => {
  const center = 110;
  const radius = 74;
  const dimensions = radar.length;
  if (!dimensions) return <p className="cf-muted">Skill profile is unavailable.</p>;
  if (
    radar.some(
      (entry) => entry.firstScore === null || entry.secondScore === null,
    )
  ) {
    return (
      <p className="cf-muted">
        Some contest-growth dimensions are unavailable, so the pair-normalized radar cannot be plotted accurately.
      </p>
    );
  }
  return (
    <svg
      className="cf-compare-radar"
      role="img"
      aria-label="Relative skill growth radar chart"
      viewBox="0 0 220 220"
    >
      {[25, 50, 75, 100].map((scale) => (
        <polygon
          fill="none"
          key={scale}
          points={radar.map((_, index) => radarPoint(index, scale, dimensions, radius, center)).join(' ')}
          stroke="#d0d0d0"
          strokeWidth="1"
        />
      ))}
      {radar.map((entry, index) => (
        <line
          key={entry.key}
          x1={center}
          x2={radarPoint(index, 100, dimensions, radius, center).split(',')[0]}
          y1={center}
          y2={radarPoint(index, 100, dimensions, radius, center).split(',')[1]}
          stroke="#d0d0d0"
          strokeWidth="1"
        />
      ))}
      {[0, 1].map((userIndex) => (
        <polygon
          fill={SERIES_COLORS[userIndex]}
          fillOpacity="0.12"
          key={handles[userIndex]}
          points={radar
            .map((entry, index) =>
              radarPoint(
                index,
                userIndex === 0 ? entry.firstScore : entry.secondScore,
                dimensions,
                radius,
                center,
              ),
            )
            .join(' ')}
          stroke={SERIES_COLORS[userIndex]}
          strokeWidth="2"
        />
      ))}
      {radar.map((entry, index) => {
        const [x, y] = radarPoint(index, 112, dimensions, radius, center)
          .split(',')
          .map(Number);
        return (
          <text
            fill="#333"
            fontSize="9"
            key={entry.key}
            textAnchor="middle"
            x={x}
            y={y}
          >
            {entry.label}
          </text>
        );
      })}
    </svg>
  );
};

SkillRadarChart.propTypes = {
  radar: PropTypes.arrayOf(PropTypes.object).isRequired,
  handles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

const SkillValueSection = ({ comparison }) => {
  const [first, second] = comparison.users;
  const metrics = [
    ['Total skill growth', first.skillGrowth.totalGrowth, second.skillGrowth.totalGrowth],
    ['Average change per contest', first.skillGrowth.averageChange, second.skillGrowth.averageChange],
    ['Momentum (last 3 contests)', first.skillGrowth.momentum, second.skillGrowth.momentum],
    ['Max single-contest gain', first.skillGrowth.maxSingleGain, second.skillGrowth.maxSingleGain],
    ['Volatility (rating points)', first.skillGrowth.volatility, second.skillGrowth.volatility],
    [
      'Head-to-head contest win rate',
      first.contestPerformance.sharedContests
        ? `${first.contestPerformance.wins}/${first.contestPerformance.sharedContests}`
        : null,
      second.contestPerformance.sharedContests
        ? `${second.contestPerformance.wins}/${second.contestPerformance.sharedContests}`
        : null,
    ],
  ];
  const handles = [first.handle, second.handle];

  return (
    <section className="cf-compare-box">
      <div className="cf-profile-section-heading">
        <h2>Skill value &amp; statistical growth</h2>
        <span className="cf-muted">Contest-by-contest profile</span>
      </div>
      <div className="cf-table-wrap">
        <table className="cf-table">
          <thead>
            <tr><th>Metric</th><th>{handles[0]}</th><th>{handles[1]}</th></tr>
          </thead>
          <tbody>
            {metrics.map(([label, firstValue, secondValue]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="cf-mono">{typeof firstValue === 'number' ? format(firstValue) : firstValue ?? 'N/A'}</td>
                <td className="cf-mono">{typeof secondValue === 'number' ? format(secondValue) : secondValue ?? 'N/A'}</td>
              </tr>
            ))}
            <tr>
              <td>Rarity skill value</td>
              <td className="cf-mono">N/A</td>
              <td className="cf-mono">N/A</td>
            </tr>
          </tbody>
        </table>
      </div>
      <details className="cf-compare-details">
        <summary>How Skill Value Works</summary>
        <p>{comparison.skillValue.formula}, where F(R) is a population-wide rating percentile.</p>
        <p>{comparison.skillValue.explanation}</p>
      </details>

      <div className="cf-compare-chart-grid">
        <figure>
          <figcaption>Cumulative skill growth over contests</figcaption>
          <RatingHistoryChart handles={handles} histories={comparison.growth.contestHistory} />
        </figure>
        <figure>
          <figcaption>Contest-by-contest rating changes</figcaption>
          <RatingChangeChart handles={handles} histories={comparison.growth.contestHistory} />
        </figure>
        <figure>
          <figcaption>Relative skill growth profile (0–100)</figcaption>
          <SkillRadarChart handles={handles} radar={comparison.growth.radar} />
          <p className="cf-muted">Radar values are normalized within this head-to-head pair.</p>
        </figure>
      </div>
      <div className="cf-compare-legend">
        {handles.map((handle, index) => (
          <span key={handle}>
            <i style={{ backgroundColor: SERIES_COLORS[index] }} />
            {handle}
          </span>
        ))}
      </div>
    </section>
  );
};

SkillValueSection.propTypes = {
  comparison: PropTypes.shape({
    users: PropTypes.arrayOf(PropTypes.shape({
      handle: PropTypes.string.isRequired,
      skillGrowth: PropTypes.object.isRequired,
      contestPerformance: PropTypes.object.isRequired,
    })).isRequired,
    growth: PropTypes.shape({
      contestHistory: PropTypes.arrayOf(PropTypes.array).isRequired,
      radar: PropTypes.arrayOf(PropTypes.object).isRequired,
    }).isRequired,
    skillValue: PropTypes.shape({
      formula: PropTypes.string.isRequired,
      explanation: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default SkillValueSection;
