import PropTypes from 'prop-types';
import RatingBadge from '../RatingBadge.js';
import DSADifficultySummary from './DSADifficultySummary.js';
import RatingProgressionChart from './RatingProgressionChart.js';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toISOString().slice(0, 10);
};

const PlatformStatsTable = ({ platforms, contests, difficulty }) => (
  <section className="cf-profile-section">
    <div className="cf-profile-section-heading">
      <h2>Platform ratings &amp; solve counts</h2>
      <span className="cf-muted">Platform-level statistics</span>
    </div>
    <div className="cf-table-wrap">
      <table className="cf-table cf-profile-platform-table">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Handle</th>
            <th>Current Rating</th>
            <th>Max Rating</th>
            <th>Solved Count</th>
            <th>Last Synced</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map((platform) => (
            <tr key={platform.key}>
              <td>{platform.label}</td>
              <td className="cf-mono">
                {platform.handle ? (
                  <a
                    href={`${platform.profileUrl}${encodeURIComponent(platform.handle)}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {platform.handle}
                  </a>
                ) : (
                  <span className="cf-muted">—</span>
                )}
              </td>
              <td><RatingBadge rating={platform.rating} /></td>
              <td><RatingBadge rating={platform.maxRating} /></td>
              <td className="cf-mono">{platform.solvedCount}</td>
              <td className="cf-mono">{formatDate(platform.syncedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <RatingProgressionChart contests={contests} />
    <DSADifficultySummary counts={difficulty} />
  </section>
);

PlatformStatsTable.propTypes = {
  platforms: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      profileUrl: PropTypes.string.isRequired,
      handle: PropTypes.string,
      rating: PropTypes.number,
      maxRating: PropTypes.number,
      solvedCount: PropTypes.number.isRequired,
      syncedAt: PropTypes.string,
    }),
  ),
  contests: PropTypes.arrayOf(PropTypes.object),
  difficulty: PropTypes.shape({
    easy: PropTypes.number.isRequired,
    medium: PropTypes.number.isRequired,
    hard: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
  }).isRequired,
};

PlatformStatsTable.defaultProps = {
  platforms: [],
  contests: [],
};

export default PlatformStatsTable;
