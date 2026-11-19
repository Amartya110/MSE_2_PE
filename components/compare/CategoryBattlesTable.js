import PropTypes from 'prop-types';

const valueText = (battle, value) => {
  if (value === null || value === undefined) return 'N/A';
  return battle.id === 'problemSpeed'
    ? `${value.toFixed(1)} min`
    : battle.id === 'contestPerformance'
      ? value.toFixed(1)
      : `${Math.round(value)}${battle.id === 'recentActivity' ? ' solves' : ' days'}`;
};

const CategoryBattlesTable = ({ comparison }) => (
  <section className="cf-compare-box">
    <div className="cf-profile-section-heading">
      <h2>6-category battle matrix</h2>
      <span className="cf-muted">
        {comparison.categories.filter((battle) => battle.available).length} measurable ·{' '}
        {comparison.categories.filter((battle) => battle.winner === 'first').length} Handle 1 wins ·{' '}
        {comparison.categories.filter((battle) => battle.winner === 'second').length} Handle 2 wins ·{' '}
        {comparison.categories.filter((battle) => battle.winner === 'tie').length} ties
      </span>
    </div>
    <div className="cf-table-wrap">
      <table className="cf-table cf-category-battle-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>{comparison.users[0].handle}</th>
            <th>Relative split</th>
            <th>{comparison.users[1].handle}</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {comparison.categories.map((battle) => (
            <tr key={battle.id}>
              <td>{battle.label}</td>
              <td className="cf-mono">{valueText(battle, battle.firstValue)}</td>
              <td>
                {battle.available ? (
                  <div
                    className="cf-compare-split-bar"
                    aria-label={`${Math.round(battle.firstShare)}% versus ${Math.round(battle.secondShare)}%`}
                  >
                    <span style={{ width: `${battle.firstShare}%` }} />
                    <span style={{ width: `${battle.secondShare}%` }} />
                  </div>
                ) : (
                  <span className="cf-muted">N/A</span>
                )}
              </td>
              <td className="cf-mono">{valueText(battle, battle.secondValue)}</td>
              <td>
                {!battle.available
                  ? <span className="cf-muted">N/A</span>
                  : battle.winner === 'tie'
                    ? <span className="cf-compare-tie">Tie</span>
                    : (
                      <strong className="cf-compare-winner-badge">
                        {battle.winner === 'first'
                          ? comparison.users[0].handle
                          : comparison.users[1].handle}
                      </strong>
                    )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

CategoryBattlesTable.propTypes = {
  comparison: PropTypes.shape({
    users: PropTypes.arrayOf(PropTypes.shape({
      handle: PropTypes.string.isRequired,
    })).isRequired,
    categories: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      firstValue: PropTypes.number,
      secondValue: PropTypes.number,
      firstShare: PropTypes.number,
      secondShare: PropTypes.number,
      winner: PropTypes.string,
      available: PropTypes.bool.isRequired,
    })).isRequired,
  }).isRequired,
};

export default CategoryBattlesTable;
