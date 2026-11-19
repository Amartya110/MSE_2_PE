import PropTypes from 'prop-types';

const optionalPercent = (value) =>
  Number.isFinite(value) ? `${value.toFixed(1)}%` : 'N/A';

const TagBattleGrid = ({ comparison }) => (
  <section className="cf-compare-box">
    <div className="cf-profile-section-heading">
      <h2>Tag / task-category head-to-head</h2>
      <span className="cf-muted">{comparison.tags.length} categories</span>
    </div>
    {comparison.tags.length ? (
      <div className="cf-table-wrap">
        <table className="cf-table">
          <thead>
            <tr>
              <th>Topic / task group</th>
              <th>{comparison.users[0].handle}</th>
              <th>{comparison.users[1].handle}</th>
              <th>Lead</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {comparison.tags.map((battle) => (
              <tr key={battle.tag}>
                <td className="cf-mono">{battle.tag}</td>
                <td className="cf-mono">{battle.firstSolved}</td>
                <td className="cf-mono">{battle.secondSolved}</td>
                <td>
                  {battle.winner === 'tie'
                    ? 'Tie'
                    : battle.winner === 'first'
                      ? comparison.users[0].handle
                      : comparison.users[1].handle}
                </td>
                <td>
                  <details className="cf-compare-details">
                    <summary>Show</summary>
                    <span>
                      Avg rating: {battle.firstAverageRating?.toFixed(0) ?? 'N/A'} :{' '}
                      {battle.secondAverageRating?.toFixed(0) ?? 'N/A'}
                    </span>
                    <br />
                    <span>
                      Accuracy: {optionalPercent(battle.firstAccuracy)} :{' '}
                      {optionalPercent(battle.secondAccuracy)}
                    </span>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="cf-muted">This public profile endpoint did not provide topic/task-category data.</p>
    )}
  </section>
);

TagBattleGrid.propTypes = {
  comparison: PropTypes.shape({
    users: PropTypes.arrayOf(PropTypes.shape({
      handle: PropTypes.string.isRequired,
    })).isRequired,
    tags: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default TagBattleGrid;
