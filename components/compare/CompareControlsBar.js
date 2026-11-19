import { useState } from 'react';
import PropTypes from 'prop-types';

const HANDLE_PATTERN = /^[A-Za-z0-9_.-]{1,50}$/;
const PLATFORMS = [
  { key: 'codeforces', label: 'Codeforces' },
  { key: 'leetcode', label: 'LeetCode' },
  { key: 'atcoder', label: 'AtCoder' },
];

const CompareControlsBar = ({ busy, onCompare, onClear }) => {
  const [platform, setPlatform] = useState('codeforces');
  const [handle1, setHandle1] = useState('');
  const [handle2, setHandle2] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const first = handle1.trim();
    const second = handle2.trim();
    if (!HANDLE_PATTERN.test(first) || !HANDLE_PATTERN.test(second)) {
      setError('Enter both handles using 1–50 letters, numbers, dots, underscores or hyphens.');
      return;
    }
    if (first.toLowerCase() === second.toLowerCase()) {
      setError('Enter two different platform handles.');
      return;
    }
    setError('');
    onCompare({ platform, handle1: first, handle2: second });
  };

  const clear = () => {
    setPlatform('codeforces');
    setHandle1('');
    setHandle2('');
    setError('');
    onClear();
  };

  return (
    <section className="cf-compare-controls-box" aria-label="Public profile comparison controls">
      <form className="cf-compare-controls" onSubmit={submit}>
        <label className="cf-profile-field">
          <span>Platform</span>
          <select
            className="cf-input"
            onChange={(event) => setPlatform(event.target.value)}
            value={platform}
          >
            {PLATFORMS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
        <label className="cf-profile-field">
          <span>Handle 1</span>
          <input
            autoComplete="off"
            className="cf-input"
            onChange={(event) => setHandle1(event.target.value)}
            placeholder="First public handle"
            value={handle1}
          />
        </label>
        <label className="cf-profile-field">
          <span>Handle 2</span>
          <input
            autoComplete="off"
            className="cf-input"
            onChange={(event) => setHandle2(event.target.value)}
            placeholder="Second public handle"
            value={handle2}
          />
        </label>
        <div className="cf-compare-control-actions">
          <button className="cf-button" disabled={busy} type="submit">
            {busy ? 'Comparing…' : '[Compare Now]'}
          </button>
          <button className="cf-button cf-button-secondary" onClick={clear} type="button">
            [Clear]
          </button>
        </div>
      </form>
      {error && <p className="cf-profile-error" role="alert">{error}</p>}
    </section>
  );
};

CompareControlsBar.propTypes = {
  busy: PropTypes.bool,
  onCompare: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

CompareControlsBar.defaultProps = { busy: false };

export default CompareControlsBar;
