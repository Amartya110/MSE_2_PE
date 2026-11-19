import PropTypes from 'prop-types';

const WIDTH = 780;
const HEIGHT = 230;
const PADDING = { top: 16, right: 18, bottom: 30, left: 44 };
const RATING_BANDS = [
  { from: 0, to: 1200, color: '#fff8d8' },
  { from: 1200, to: 1400, color: '#eff3f5' },
  { from: 1400, to: 1600, color: '#e5f7f6' },
  { from: 1600, to: 1900, color: '#e9efff' },
  { from: 1900, to: 2100, color: '#f5eafa' },
  { from: 2100, to: 2400, color: '#fff0dc' },
  { from: 2400, to: 4000, color: '#ffebeb' },
];

const RatingProgressionChart = ({ contests }) => {
  const width = WIDTH - PADDING.left - PADDING.right;
  const height = HEIGHT - PADDING.top - PADDING.bottom;
  const ratings = contests.map((contest) => Number(contest.rating));
  const minimum = ratings.length
    ? Math.max(0, Math.floor(Math.min(...ratings) / 400) * 400)
    : 0;
  const maximum = Math.max(
    minimum + 400,
    ratings.length ? Math.ceil(Math.max(...ratings) / 400) * 400 : 400,
  );
  const x = (index) =>
    PADDING.left +
    (contests.length < 2 ? width / 2 : (index / (contests.length - 1)) * width);
  const y = (rating) =>
    PADDING.top + ((maximum - rating) / (maximum - minimum)) * height;
  const points = contests.map((contest, index) => ({
    x: x(index),
    y: y(Number(contest.rating)),
    contest,
  }));
  const bands = RATING_BANDS.map((band) => {
    const from = Math.max(band.from, minimum);
    const to = Math.min(band.to, maximum);
    return {
      ...band,
      y: y(to),
      height: Math.max(0, y(from) - y(to)),
    };
  }).filter((band) => band.height > 0);

  return (
    <section className="cf-profile-chart-section">
      <div className="cf-profile-section-heading">
        <h2>Rating progression</h2>
        <span className="cf-muted">Contest rating · chronological</span>
      </div>
      {points.length ? (
        <div className="cf-profile-chart-wrap">
          <svg
            aria-label="Contest rating progression chart"
            className="cf-profile-chart"
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            {bands.map((band) => (
              <rect
                fill={band.color}
                height={band.height}
                key={`${band.from}-${band.to}`}
                width={width}
                x={PADDING.left}
                y={band.y}
              />
            ))}
            {[minimum, Math.round((minimum + maximum) / 2), maximum].map((rating) => (
              <g key={rating}>
                <line
                  stroke="#c9c9c9"
                  strokeDasharray="3 3"
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y(rating)}
                  y2={y(rating)}
                />
                <text className="cf-profile-chart-label" x="3" y={y(rating) + 4}>
                  {rating}
                </text>
              </g>
            ))}
            <polyline
              fill="none"
              points={points.map((point) => `${point.x},${point.y}`).join(' ')}
              stroke="#0000cc"
              strokeWidth="2"
            />
            {points.map(({ x: pointX, y: pointY, contest }) => (
              <circle
                cx={pointX}
                cy={pointY}
                fill="#0000cc"
                key={`${contest.platform}-${contest.contestId}-${contest.date}`}
                r="3"
              >
                <title>
                  {`${contest.contestName ?? contest.contestId}: ${contest.rating}`}
                </title>
              </circle>
            ))}
            <text
              className="cf-profile-chart-label"
              textAnchor="start"
              x={PADDING.left}
              y={HEIGHT - 7}
            >
              {new Date(contests[0].date).toISOString().slice(0, 10)}
            </text>
            <text
              className="cf-profile-chart-label"
              textAnchor="end"
              x={WIDTH - PADDING.right}
              y={HEIGHT - 7}
            >
              {new Date(contests[contests.length - 1].date).toISOString().slice(0, 10)}
            </text>
          </svg>
        </div>
      ) : (
        <p className="cf-muted cf-profile-empty-chart">
          Rating history appears here after contest data is synced.
        </p>
      )}
    </section>
  );
};

RatingProgressionChart.propTypes = {
  contests: PropTypes.arrayOf(
    PropTypes.shape({
      platform: PropTypes.string,
      contestId: PropTypes.string,
      contestName: PropTypes.string,
      rating: PropTypes.number,
      date: PropTypes.string,
    }),
  ),
};

RatingProgressionChart.defaultProps = { contests: [] };

export default RatingProgressionChart;
