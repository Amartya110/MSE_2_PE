import PropTypes from 'prop-types';

const format = (value, digits = 1) =>
  Number.isFinite(value) ? Number(value).toFixed(digits) : 'N/A';

const maxCount = (users) =>
  Math.max(
    1,
    ...users.flatMap((user) =>
      user.difficultyDistribution.map((bucket) => bucket.count),
    ),
  );

const DetailedInsightsGrid = ({ comparison }) => {
  const maximum = maxCount(comparison.users);
  return (
    <section className="cf-compare-box">
      <div className="cf-profile-section-heading">
        <h2>Detailed insights &amp; difficulty distribution</h2>
        <span className="cf-muted">Observed public data</span>
      </div>
      <div className="cf-compare-two-column">
        {comparison.users.map((user) => (
          <article className="cf-compare-insight-column" key={user.handle}>
            <h3 className="cf-mono">{user.handle}</h3>
            <dl className="cf-compare-metric-list">
              <div><dt>Average attempts per solved problem</dt><dd>{format(user.submissions.attemptsPerSolved)}</dd></div>
              <div><dt>Best contest rank</dt><dd>{user.bestContestRank ?? 'N/A'}</dd></div>
              <div><dt>Average contest rank</dt><dd>{format(user.averageContestRank)}</dd></div>
              <div>
                <dt>Preferred solve time (UTC)</dt>
                <dd>
                  {user.submissions.preferredTimeOfDay.some((period) => period.count)
                    ? user.submissions.preferredTimeOfDay
                        .filter((period) => period.count)
                        .sort((left, right) => right.count - left.count)[0].label
                    : 'N/A'}
                </dd>
              </div>
              <div><dt>Account age</dt><dd>{user.accountAgeLabel ?? 'Not published'}</dd></div>
              <div><dt>Observed submissions</dt><dd>{user.submissions.totalObserved || 'N/A'}</dd></div>
            </dl>
            <h4>Difficulty / task distribution</h4>
            <div className="cf-compare-distribution">
              {user.difficultyDistribution.map((bucket) => (
                <div className="cf-compare-distribution-row" key={bucket.label}>
                  <span>{bucket.label}</span>
                  <span className="cf-compare-distribution-track">
                    <span style={{ width: `${(bucket.count / maximum) * 100}%` }} />
                  </span>
                  <strong className="cf-mono">{bucket.count}</strong>
                </div>
              ))}
            </div>
            {user.taskCategoryDistribution.length > 0 && (
              <>
                <h4>AtCoder task groups</h4>
                <div className="cf-compare-distribution">
                  {user.taskCategoryDistribution.map((bucket) => (
                    <div className="cf-compare-distribution-row" key={bucket.label}>
                      <span>{bucket.label}</span>
                      <span className="cf-compare-distribution-track">
                        <span style={{ width: `${(bucket.count / maximum) * 100}%` }} />
                      </span>
                      <strong className="cf-mono">{bucket.count}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
            {user.difficultyCoverage && (
              <p className="cf-muted">{user.difficultyCoverage}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

DetailedInsightsGrid.propTypes = {
  comparison: PropTypes.shape({
    users: PropTypes.arrayOf(PropTypes.shape({
      handle: PropTypes.string.isRequired,
      submissions: PropTypes.object.isRequired,
      difficultyDistribution: PropTypes.arrayOf(PropTypes.object).isRequired,
    })).isRequired,
  }).isRequired,
};

export default DetailedInsightsGrid;
