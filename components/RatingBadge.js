import PropTypes from 'prop-types';
import { CodeforcesRankScale } from './codeforcesRankScale.js';

export { CodeforcesRankScale };

const RatingBadge = ({ rating, prefix, color, title }) => {
  const rank = CodeforcesRankScale.forRating(rating);
  const displayRating = Number.isFinite(rating) ? rating : 'Unrated';

  return (
    <span
      className="cf-rating-badge"
      style={{ color: color ?? rank.color }}
      title={title ?? rank.label}
    >
      {prefix}{displayRating}
    </span>
  );
};

RatingBadge.propTypes = {
  rating: PropTypes.number,
  prefix: PropTypes.string,
  color: PropTypes.string,
  title: PropTypes.string,
};

RatingBadge.defaultProps = {
  rating: null,
  prefix: '',
  color: undefined,
  title: undefined,
};

export default RatingBadge;
