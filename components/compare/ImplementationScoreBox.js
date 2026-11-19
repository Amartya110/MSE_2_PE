import PropTypes from 'prop-types';

const display = (value, suffix = '') =>
  Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : 'N/A';

const ImplementationScoreBox = ({ comparison }) => (
  <section className="cf-compare-box">
    <div className="cf-profile-section-heading">
      <h2>Implementation score &amp; volume</h2>
      <span className="cf-muted">0–100 weighted score</span>
    </div>
    <div className="cf-compare-two-column">
      {comparison.users.map((user) => (
        <article className="cf-compare-insight-column" key={user.handle}>
          <h3 className="cf-mono">{user.handle}</h3>
          <p className="cf-compare-large-metric">
            {display(user.implementationScore.score)}
            <span> / 100</span>
          </p>
          <p className="cf-muted">
            {user.implementationScore.totalSolved} total solved ·{' '}
            {user.implementationScore.hardCount ?? 'N/A'} hard ·{' '}
            {user.implementationScore.implementationCount ?? 'N/A'} implementation-tagged
          </p>
          <details className="cf-compare-details">
            <summary>Show breakdown</summary>
            <div className="cf-table-wrap">
              <table className="cf-table">
                <thead>
                  <tr><th>Component</th><th>Score</th><th>Weight</th><th>Contribution</th></tr>
                </thead>
                <tbody>
                  {user.implementationScore.components.map((component) => (
                    <tr key={component.label}>
                      <td>{component.label}</td>
                      <td className="cf-mono">{display(component.value)}</td>
                      <td className="cf-mono">{component.weight}%</td>
                      <td className="cf-mono">{display(component.contribution)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th>Average rating / difficulty points</th>
                    <td className="cf-mono" colSpan="3">{display(user.implementationScore.averagePoints)}</td>
                  </tr>
                  <tr>
                    <th>Implementation share</th>
                    <td className="cf-mono" colSpan="3">{display(user.implementationScore.implementationPercent, '%')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </article>
      ))}
    </div>
    <p className="cf-muted">
      Score weights are normalized over available inputs: solved volume (40%), hard-problem share (30%), and implementation-tag share (30%). Unavailable inputs are excluded, not treated as zero.
    </p>
  </section>
);

ImplementationScoreBox.propTypes = {
  comparison: PropTypes.shape({
    users: PropTypes.arrayOf(PropTypes.shape({
      handle: PropTypes.string.isRequired,
      implementationScore: PropTypes.object.isRequired,
    })).isRequired,
  }).isRequired,
};

export default ImplementationScoreBox;
