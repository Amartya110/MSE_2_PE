import PropTypes from 'prop-types';

const percent = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : 'N/A';

const GrowthAnalysisBox = ({ comparison }) => (
  <section className="cf-compare-box">
    <div className="cf-profile-section-heading">
      <h2>Problem-solving growth &amp; stretch analysis</h2>
      <span className="cf-muted">Rated solves compared with rating at solve time</span>
    </div>
    <div className="cf-compare-two-column">
      {comparison.users.map((user) => (
        <article className="cf-compare-insight-column" key={user.handle}>
          <h3 className="cf-mono">{user.handle}</h3>
          <dl className="cf-compare-metric-list">
            <div>
              <dt>Known rated solves</dt>
              <dd>{user.growthAnalysis.knownRatedSolves}</dd>
            </div>
            <div>
              <dt>100+ rating points above</dt>
              <dd>{user.growthAnalysis.above100} ({percent(user.growthAnalysis.rate100)})</dd>
            </div>
            <div>
              <dt>200+ rating points above</dt>
              <dd>{user.growthAnalysis.above200} ({percent(user.growthAnalysis.rate200)})</dd>
            </div>
          </dl>
          <p className="cf-compare-next-step">
            <strong>Next step:</strong> {user.growthAnalysis.nextStep}
          </p>
        </article>
      ))}
    </div>
    <ul className="cf-compare-insight-list">
      {comparison.growth.keyInsights.map((insight) => <li key={insight}>{insight}</li>)}
    </ul>
  </section>
);

GrowthAnalysisBox.propTypes = {
  comparison: PropTypes.shape({
    users: PropTypes.arrayOf(PropTypes.shape({
      handle: PropTypes.string.isRequired,
      growthAnalysis: PropTypes.object.isRequired,
    })).isRequired,
    growth: PropTypes.shape({
      keyInsights: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
  }).isRequired,
};

export default GrowthAnalysisBox;
