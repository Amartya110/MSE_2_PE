import PropTypes from 'prop-types';
import RatingBadge from '../RatingBadge.js';

const formatNumber = (value, digits = 1) =>
  Number.isFinite(value) ? Number(value).toFixed(digits) : 'N/A';

const CompareVerdictBox = ({ comparison }) => {
  const [first, second] = comparison.users;
  const summary = (user) => [
    ['Composite score', `${formatNumber(user.compositeScore)}%`],
    ['Categories won', `${user.categoriesWon}/${comparison.scoring.totalCategories}`],
    ['Peak rating', formatNumber(user.maxRating, 0)],
    [user.totalSolvedLabel, formatNumber(user.totalSolved, 0)],
    [
      user.averageDifficultyLabel,
      Number.isFinite(user.averageDifficulty)
        ? formatNumber(user.averageDifficulty)
        : 'N/A',
    ],
    ['Contests participated', formatNumber(user.contestsParticipated, 0)],
    [
      'Observed submission success',
      Number.isFinite(user.submissionSuccessRate)
        ? `${formatNumber(user.submissionSuccessRate)}%`
        : 'N/A',
    ],
  ];
  const winner = comparison.winner;
  const winnerName = winner.handle ?? 'Tie';

  return (
    <section className="cf-compare-box cf-compare-verdict">
      <div className="cf-profile-section-heading">
        <h2>Head-to-head verdict</h2>
        <span className="cf-muted">{comparison.platform.toUpperCase()} public profiles</span>
      </div>
      <div className="cf-compare-summary-grid">
        {[first, second].map((user, index) => (
          <article className="cf-compare-summary-card" key={user.handle}>
            <h3 className="cf-mono">{user.handle}</h3>
            <p className="cf-compare-rank-line">
              <span style={{ color: user.rankColor }}>{user.rankTitle}</span>
              {' · '}
              <RatingBadge
                color={user.rankColor}
                rating={user.currentRating}
                title={user.rankTitle}
              />
              <span className="cf-muted"> current</span>
            </p>
            <div className="cf-table-wrap">
              <table className="cf-table cf-compare-summary-table">
                <tbody>
                  {summary(user).map(([label, value]) => (
                    <tr key={label}>
                      <th>{label}</th>
                      <td className="cf-mono">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className="cf-muted">
              {index === 0 ? 'Handle 1' : 'Handle 2'} · {user.categoriesAvailable}/
              {comparison.scoring.totalCategories} categories measurable
            </span>
          </article>
        ))}
      </div>
      <div className="cf-compare-final-strip" role="status">
        {winner.handle ? (
          <>
            <strong>{winnerName} leads by {formatNumber(winner.pointLead)} points</strong>
            <span>
              {Number.isFinite(winner.percentAdvantage)
                ? ` — ${formatNumber(winner.percentAdvantage)}% advantage`
                : ' — percentage advantage unavailable'}
            </span>
          </>
        ) : (
          <strong>No overall winner from the available categories.</strong>
        )}
      </div>
      <p className="cf-muted cf-compare-method-note">{comparison.scoring.method}</p>
    </section>
  );
};

CompareVerdictBox.propTypes = {
  comparison: PropTypes.shape({
    platform: PropTypes.string.isRequired,
    users: PropTypes.arrayOf(PropTypes.object).isRequired,
    scoring: PropTypes.shape({
      method: PropTypes.string.isRequired,
      totalCategories: PropTypes.number.isRequired,
    }).isRequired,
    winner: PropTypes.shape({
      handle: PropTypes.string,
      pointLead: PropTypes.number,
      percentAdvantage: PropTypes.number,
    }).isRequired,
  }).isRequired,
};

export default CompareVerdictBox;
