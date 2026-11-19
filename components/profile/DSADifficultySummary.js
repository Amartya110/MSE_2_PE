import PropTypes from 'prop-types';

const DIFFICULTIES = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
  { key: 'total', label: 'Total' },
];

const DSADifficultySummary = ({ counts }) => (
  <section className="cf-profile-difficulty-section">
    <div className="cf-profile-section-heading">
      <h2>DSA difficulty summary</h2>
      <span className="cf-muted">Total counts unique platform problem IDs</span>
    </div>
    <div className="cf-table-wrap">
      <table className="cf-table cf-profile-difficulty-table">
        <thead>
          <tr>{DIFFICULTIES.map(({ key, label }) => <th key={key}>{label}</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            {DIFFICULTIES.map(({ key }) => (
              <td className="cf-mono" key={key}>{counts[key]}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  </section>
);

DSADifficultySummary.propTypes = {
  counts: PropTypes.shape({
    easy: PropTypes.number.isRequired,
    medium: PropTypes.number.isRequired,
    hard: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
  }).isRequired,
};

export default DSADifficultySummary;
