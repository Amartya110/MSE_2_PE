import PropTypes from 'prop-types';
import RatingBadge from '../RatingBadge.js';
import { CodeforcesRankScale } from '../codeforcesRankScale.js';
import { PROFILE_PLATFORMS } from './profileMetrics.js';

const platformHandles = (profile) =>
  profile?.platformHandles instanceof Map
    ? Object.fromEntries(profile.platformHandles)
    : profile?.platformHandles ?? {};

const ProfileHeaderBox = ({
  profile,
  handle,
  metrics,
  canSync,
  syncBusy,
  onSync,
}) => {
  const handles = platformHandles(profile);
  const rank = CodeforcesRankScale.forRating(metrics.unifiedCpRating);

  return (
    <section className="cf-profile-header-box">
      <div className="cf-profile-header-main">
        <div>
          <div className="cf-profile-eyebrow">DSPAA PROFILE</div>
          <h1 className="cf-profile-handle">
            <span style={{ color: rank.color }}>{handle}</span>
          </h1>
          <div className="cf-profile-rank">
            <span style={{ color: rank.color }}>{rank.label}</span>
            <span className="cf-muted"> · unified rating average</span>
          </div>
        </div>
        <div className="cf-profile-score-strip">
          <div>
            <span className="cf-profile-score-label">CP rating</span>
            <strong><RatingBadge rating={metrics.unifiedCpRating} /></strong>
          </div>
          <div>
            <span className="cf-profile-score-label">Max average</span>
            <strong><RatingBadge rating={metrics.unifiedMaxRating} /></strong>
          </div>
          <div>
            <span className="cf-profile-score-label">DSA solved</span>
            <strong className="cf-mono">{metrics.totalUniqueSolved}</strong>
          </div>
        </div>
      </div>

      <div className="cf-profile-linked-row">
        {PROFILE_PLATFORMS.map(({ key, label, profileUrl }) => (
          <span className="cf-profile-platform-link" key={key}>
            <span>{label}:</span>
            {handles[key] ? (
              <a href={`${profileUrl}${encodeURIComponent(handles[key])}`} rel="noreferrer" target="_blank">
                {handles[key]}
              </a>
            ) : (
              <span className="cf-muted">not linked</span>
            )}
          </span>
        ))}
        {canSync ? (
          <button
            className="cf-button cf-profile-sync-button"
            disabled={syncBusy}
            onClick={onSync}
            type="button"
          >
            {syncBusy ? 'Syncing…' : '[Sync Now]'}
          </button>
        ) : !profile ? (
          <span className="cf-muted">Sign in as this tracker user to sync profiles.</span>
        ) : null}
      </div>
    </section>
  );
};

ProfileHeaderBox.propTypes = {
  profile: PropTypes.shape({
    platformHandles: PropTypes.oneOfType([
      PropTypes.objectOf(PropTypes.string),
      PropTypes.instanceOf(Map),
    ]),
  }),
  handle: PropTypes.string.isRequired,
  metrics: PropTypes.shape({
    unifiedCpRating: PropTypes.number,
    unifiedMaxRating: PropTypes.number,
    totalUniqueSolved: PropTypes.number.isRequired,
  }).isRequired,
  canSync: PropTypes.bool,
  syncBusy: PropTypes.bool,
  onSync: PropTypes.func.isRequired,
};

ProfileHeaderBox.defaultProps = {
  profile: null,
  canSync: false,
  syncBusy: false,
};

export default ProfileHeaderBox;
