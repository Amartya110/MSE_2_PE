import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import RatingBadge from '../RatingBadge.js';
import { PROFILE_PLATFORMS } from './profileMetrics.js';

const normalizeVerdict = (verdict) => {
  const normalized = String(verdict ?? 'unknown')
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();
  if (['accepted', 'ac', 'ok'].includes(normalized)) {
    return { label: 'Accepted', tone: 'accepted', key: 'accepted' };
  }
  if (normalized.includes('wrong answer') || normalized === 'wa') {
    return { label: 'Wrong answer', tone: 'failed', key: 'wrong answer' };
  }
  if (normalized.includes('time limit') || normalized === 'tle') {
    return {
      label: 'Time limit exceeded',
      tone: 'failed',
      key: 'time limit exceeded',
    };
  }
  return {
    label: normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    tone: 'neutral',
    key: normalized,
  };
};

const getProblemUrl = (platform, problemId) => {
  const id = String(problemId);
  if (platform === 'codeforces') {
    const separator = id.indexOf('-');
    return separator > 0
      ? `https://codeforces.com/problemset/problem/${encodeURIComponent(
          id.slice(0, separator),
        )}/${encodeURIComponent(id.slice(separator + 1))}`
      : 'https://codeforces.com/problemset';
  }
  if (platform === 'leetcode') {
    return `https://leetcode.com/problems/${encodeURIComponent(id)}/`;
  }
  if (platform === 'codechef') {
    return `https://www.codechef.com/problems/${encodeURIComponent(id)}`;
  }
  if (platform === 'atcoder') {
    const match = id.match(/^([a-z0-9]+)_([a-z0-9]+)$/i);
    return match
      ? `https://atcoder.jp/contests/${encodeURIComponent(
          match[1],
        )}/tasks/${encodeURIComponent(id.toLowerCase())}`
      : 'https://atcoder.jp/';
  }
  return '#';
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toISOString().slice(0, 16).replace('T', ' ');
};

const SubmissionsTable = ({ submissions }) => {
  const [platformFilter, setPlatformFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState('all');

  const verdictOptions = useMemo(
    () =>
      [...new Set(submissions.map((submission) => normalizeVerdict(submission.verdict).key))]
        .sort()
        .map((key) => ({
          key,
          label: normalizeVerdict(key).label,
        })),
    [submissions],
  );

  const visibleSubmissions = useMemo(
    () =>
      submissions
        .filter(
          (submission) =>
            (platformFilter === 'all' || submission.platform === platformFilter) &&
            (verdictFilter === 'all' ||
              normalizeVerdict(submission.verdict).key === verdictFilter),
        )
        .sort(
          (left, right) =>
            new Date(right.submittedAt ?? 0).getTime() -
            new Date(left.submittedAt ?? 0).getTime(),
        ),
    [platformFilter, submissions, verdictFilter],
  );

  return (
    <section className="cf-profile-section">
      <div className="cf-profile-section-heading cf-profile-submission-heading">
        <div>
          <h2>Recent submissions</h2>
          <p className="cf-muted">Most recent first · runtime and memory are not provided by all platform APIs.</p>
        </div>
        <div className="cf-profile-filters">
          <label>
            <span>Platform</span>
            <select
              className="cf-input"
              onChange={(event) => setPlatformFilter(event.target.value)}
              value={platformFilter}
            >
              <option value="all">All platforms</option>
              {PROFILE_PLATFORMS.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Verdict</span>
            <select
              className="cf-input"
              onChange={(event) => setVerdictFilter(event.target.value)}
              value={verdictFilter}
            >
              <option value="all">All verdicts</option>
              {verdictOptions.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="cf-table-wrap">
        <table className="cf-table cf-profile-submissions-table">
          <thead>
            <tr>
              <th>#</th>
              <th>When</th>
              <th>Platform</th>
              <th>Problem</th>
              <th>Rating</th>
              <th>Verdict</th>
              <th>Time / Memory</th>
            </tr>
          </thead>
          <tbody>
            {visibleSubmissions.map((submission, index) => {
              const verdict = normalizeVerdict(submission.verdict);
              const platform = PROFILE_PLATFORMS.find(
                (item) => item.key === submission.platform,
              );
              return (
                <tr key={`${submission.platform}-${submission.problemId}-${submission.submittedAt ?? index}-${index}`}>
                  <td className="cf-mono">{index + 1}</td>
                  <td className="cf-mono">{formatDate(submission.submittedAt)}</td>
                  <td>{platform?.label ?? submission.platform}</td>
                  <td className="cf-profile-problem-cell">
                    <a
                      className="cf-mono"
                      href={getProblemUrl(submission.platform, submission.problemId)}
                      rel="noreferrer"
                      target="_blank"
                      title={submission.title || submission.problemId}
                    >
                      {submission.problemId}
                    </a>
                    {submission.title && (
                      <span className="cf-profile-problem-title">{submission.title}</span>
                    )}
                  </td>
                  <td><RatingBadge rating={submission.rating} /></td>
                  <td>
                    <strong className={`cf-profile-verdict cf-profile-verdict-${verdict.tone}`}>
                      {verdict.label}
                    </strong>
                  </td>
                  <td className="cf-mono">
                    {submission.time ?? submission.timeConsumedMillis ?? '—'}
                    {' / '}
                    {submission.memory ?? submission.memoryBytes ?? '—'}
                  </td>
                </tr>
              );
            })}
            {!visibleSubmissions.length && (
              <tr>
                <td className="cf-profile-empty-cell" colSpan="7">
                  No submissions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

SubmissionsTable.propTypes = {
  submissions: PropTypes.arrayOf(
    PropTypes.shape({
      platform: PropTypes.string.isRequired,
      problemId: PropTypes.string.isRequired,
      title: PropTypes.string,
      rating: PropTypes.number,
      verdict: PropTypes.string,
      submittedAt: PropTypes.string,
    }),
  ),
};

SubmissionsTable.defaultProps = { submissions: [] };

export default SubmissionsTable;
