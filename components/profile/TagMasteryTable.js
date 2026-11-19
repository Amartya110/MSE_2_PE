import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const SORTABLE_COLUMNS = [
  { key: 'tag', label: 'Topic / Tag', defaultDirection: 'asc' },
  { key: 'solved', label: 'Solved', defaultDirection: 'desc' },
  { key: 'attempted', label: 'Attempted', defaultDirection: 'desc' },
  { key: 'accuracy', label: 'Accuracy %', defaultDirection: 'desc' },
  { key: 'status', label: 'Mastery Status', defaultDirection: 'asc' },
];

const TagMasteryTable = ({ tags }) => {
  const [view, setView] = useState('weakest');
  const [sort, setSort] = useState({ key: 'solved', direction: 'asc' });

  const rows = useMemo(() => {
    const filtered = tags.filter((tag) => tag.attempted > 0);
    return filtered.sort((left, right) => {
      const direction = sort.direction === 'asc' ? 1 : -1;
      const leftValue = left[sort.key];
      const rightValue = right[sort.key];
      if (typeof leftValue === 'string') {
        return direction * leftValue.localeCompare(rightValue);
      }
      return direction * ((leftValue ?? 0) - (rightValue ?? 0));
    });
  }, [sort, tags]);

  const setViewMode = (nextView) => {
    setView(nextView);
    setSort({
      key: nextView === 'strongest' ? 'accuracy' : 'solved',
      direction: nextView === 'strongest' ? 'desc' : 'asc',
    });
  };

  const sortBy = (key) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <section className="cf-profile-section">
      <div className="cf-profile-section-heading cf-profile-tag-heading">
        <div>
          <h2>Tag mastery</h2>
          <p className="cf-muted">
            Accuracy uses accepted solves divided by solves plus failed attempts.
          </p>
        </div>
        <div aria-label="Tag order" className="cf-profile-toggle-group" role="group">
          <button
            aria-pressed={view === 'strongest'}
            className={view === 'strongest' ? 'cf-profile-toggle-active' : ''}
            onClick={() => setViewMode('strongest')}
            type="button"
          >
            Strongest tags
          </button>
          <button
            aria-pressed={view === 'weakest'}
            className={view === 'weakest' ? 'cf-profile-toggle-active' : ''}
            onClick={() => setViewMode('weakest')}
            type="button"
          >
            Weakest tags
          </button>
        </div>
      </div>
      {rows.length ? (
        <div className="cf-table-wrap">
          <table className="cf-table cf-profile-tag-table">
            <thead>
              <tr>
                {SORTABLE_COLUMNS.map(({ key, label }) => (
                  <th
                    aria-sort={
                      sort.key === key
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    key={key}
                  >
                    <button
                      className="cf-profile-sort-button"
                      onClick={() => sortBy(key)}
                      type="button"
                    >
                      {label}
                      {sort.key === key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((tag) => (
                <tr key={tag.tag.toLowerCase()}>
                  <td className="cf-mono">{tag.tag}</td>
                  <td className="cf-mono">{tag.solved}</td>
                  <td className="cf-mono">{tag.attempted}</td>
                  <td className="cf-mono">{tag.accuracy.toFixed(1)}%</td>
                  <td>
                    <span
                      className={`cf-profile-mastery cf-profile-mastery-${tag.status
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                    >
                      {tag.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cf-muted cf-profile-empty">
          Topic mastery appears after a platform provides tagged solve history.
        </p>
      )}
    </section>
  );
};

TagMasteryTable.propTypes = {
  tags: PropTypes.arrayOf(
    PropTypes.shape({
      tag: PropTypes.string.isRequired,
      solved: PropTypes.number.isRequired,
      failed: PropTypes.number.isRequired,
      attempted: PropTypes.number.isRequired,
      accuracy: PropTypes.number.isRequired,
      status: PropTypes.string.isRequired,
    }),
  ),
};

TagMasteryTable.defaultProps = { tags: [] };

export default TagMasteryTable;
