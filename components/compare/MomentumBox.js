import PropTypes from 'prop-types';

const pace = (value) => Number.isFinite(value) ? `${Math.round(value)}/100` : 'N/A';

const MomentumBox = ({ comparison }) => (
  <section className="cf-compare-box">
    <div className="cf-profile-section-heading">
      <h2>Recent momentum</h2>
      <span className="cf-muted">30-day and 90-day solve windows</span>
    </div>
    <div className="cf-compare-two-column">
      {comparison.users.map((user) => {
        const activity = user.recentActivity;
        return (
          <article className="cf-compare-insight-column" key={user.handle}>
            <h3 className="cf-mono">{user.handle}</h3>
            <p className={activity.active ? 'cf-compare-active' : 'cf-compare-inactive'}>
              {activity.active === null
                ? 'Activity unavailable'
                : activity.active
                  ? 'Active'
                  : 'Inactive'}
            </p>
            <div className="cf-table-wrap">
              <table className="cf-table">
                <thead><tr><th>Window</th><th>Solved</th><th>Pace score</th></tr></thead>
                <tbody>
                  <tr>
                    <td>30 days</td>
                    <td className="cf-mono">{activity.solved30Days ?? 'N/A'}</td>
                    <td className="cf-mono">{pace(activity.paceScore30)}</td>
                  </tr>
                  <tr>
                    <td>90 days</td>
                    <td className="cf-mono">{activity.solved90Days ?? 'N/A'}</td>
                    <td className="cf-mono">{pace(activity.paceScore90)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="cf-compare-next-step">
              <strong>Momentum plan:</strong>{' '}
              {activity.weeklyTarget === null
                ? 'A weekly target cannot be estimated from the available solve dates.'
                : `Target ${activity.weeklyTarget} accepted problems next week, then review the 30-day pace.`}
            </p>
          </article>
        );
      })}
    </div>
    <p className="cf-muted">
      Pace score is solved problems per day scaled to a 100-point one-solve-per-day target. History windows vary by platform.
    </p>
  </section>
);

MomentumBox.propTypes = {
  comparison: PropTypes.shape({
    users: PropTypes.arrayOf(PropTypes.shape({
      handle: PropTypes.string.isRequired,
      recentActivity: PropTypes.object.isRequired,
    })).isRequired,
  }).isRequired,
};

export default MomentumBox;
