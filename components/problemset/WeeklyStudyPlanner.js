import Link from 'next/link';
import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { buildWeeklyPlan } from '../../src/services/weeklyPlan.js';

const WeeklyStudyPlanner = ({
  enabled,
  weakTags,
  problems,
  status,
  error,
}) => {
  const weeks = useMemo(
    () => buildWeeklyPlan(problems, weakTags),
    [problems, weakTags],
  );
  const problemCount = weeks.reduce(
    (total, week) => total + week.problems.length,
    0,
  );

  return (
    <section className="cf-weekly-planner">
      <header className="cf-weekly-planner-heading">
        <div>
          <h2>10-week practice planner</h2>
          <p className="cf-muted">
            Problems targeting weak tags come first. If that rating range is short, the planner adds unsolved rated problems from a wider range.
          </p>
        </div>
        <strong className="cf-mono">{problemCount}/100 problems</strong>
      </header>
      {!enabled && (
        <p className="cf-muted">
          Sign in and sync a profile to build a plan around your weak areas.
        </p>
      )}
      {enabled && status === 'loading' && !problems.length && (
        <p className="cf-muted">Loading rated problems for your weak areas…</p>
      )}
      {error && <p className="cf-status-error" role="alert">{error}</p>}
      {enabled && status === 'succeeded' && !problemCount && (
        <p className="cf-muted">
          No eligible rated problems are in the problem bank yet. Import more Codeforces problems with <code>npm run import:codeforces</code>.
        </p>
      )}
      {problemCount > 0 && (
        <>
          <p className="cf-muted cf-weekly-planner-schedule">
            Weekly routine: solve two problems on each of five practice days; use the remaining time to review wrong attempts and upsolve.
          </p>
          <div className="cf-week-list">
            {weeks.map((week) => (
              <details
                className="cf-week"
                key={week.week}
                open={week.week === 1}
              >
                <summary>
                  <strong>Week {week.week}</strong>
                  <span>{week.problems.length}/10 problems</span>
                  <span className="cf-muted">
                    {week.focusTags.length
                      ? `Weak areas: ${week.focusTags.join(', ')}`
                      : week.problems.length
                        ? 'Focus: broader rating practice'
                        : 'No problems available'}
                  </span>
                </summary>
                {week.problems.length ? (
                  <div className="cf-table-wrap">
                    <table className="cf-table cf-week-problem-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Platform</th>
                          <th>Problem</th>
                          <th>Rating</th>
                          <th>Weak-area match</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {week.problems.map((problem) => (
                          <tr key={`${problem.platform}:${problem.problemId}`}>
                            <td className="cf-mono">{problem.position}</td>
                            <td>{problem.platform}</td>
                            <td>
                              <span className="cf-mono">{problem.problemId}</span>
                              {' · '}
                              {problem.title}
                              <div className="cf-muted">
                                {(problem.tags ?? []).join(', ') || 'No tags'}
                              </div>
                            </td>
                            <td className="cf-mono">{problem.rating ?? 'Unrated'}</td>
                            <td>{problem.reason}</td>
                            <td>
                              <Link
                                className="cf-button cf-solve-link"
                                href={`/solve/${encodeURIComponent(problem.platform)}/${encodeURIComponent(problem.problemId)}`}
                              >
                                Solve
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="cf-muted cf-week-empty">
                    No more eligible rated problems are available for this week. Add more problems to the problem bank to fill it.
                  </p>
                )}
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

WeeklyStudyPlanner.propTypes = {
  enabled: PropTypes.bool,
  weakTags: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({ tag: PropTypes.string.isRequired }),
    ]),
  ),
  problems: PropTypes.arrayOf(
    PropTypes.shape({
      platform: PropTypes.string.isRequired,
      problemId: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      rating: PropTypes.number,
      tags: PropTypes.arrayOf(PropTypes.string),
      reason: PropTypes.string,
    }),
  ),
  status: PropTypes.string,
  error: PropTypes.string,
};

WeeklyStudyPlanner.defaultProps = {
  enabled: false,
  weakTags: [],
  problems: [],
  status: 'idle',
  error: '',
};

export default WeeklyStudyPlanner;
