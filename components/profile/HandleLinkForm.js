import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { PROFILE_PLATFORMS } from './profileMetrics.js';

const HANDLE_PATTERN = /^[A-Za-z0-9_.-]{1,50}$/;
const blankHandles = () =>
  Object.fromEntries(PROFILE_PLATFORMS.map(({ key }) => [key, '']));

const HandleLinkForm = ({ initialHandles, busy, error, onSubmit, onCancel }) => {
  const [handles, setHandles] = useState(blankHandles);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setHandles({
      ...blankHandles(),
      ...(initialHandles instanceof Map
        ? Object.fromEntries(initialHandles)
        : initialHandles ?? {}),
    });
    setErrors({});
  }, [initialHandles]);

  const updateHandle = (key, value) => {
    setHandles((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const normalizedHandles = {};

    PROFILE_PLATFORMS.forEach(({ key }) => {
      const value = handles[key].trim();
      if (!value) return;
      if (!HANDLE_PATTERN.test(value)) {
        nextErrors[key] = 'Use 1–50 letters, numbers, dots, underscores or hyphens.';
      } else {
        normalizedHandles[key] = value;
      }
    });

    if (Object.keys(normalizedHandles).length === 0) {
      nextErrors.form = 'Enter at least one platform handle.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(normalizedHandles);
  };

  return (
    <form className="cf-profile-link-form" noValidate onSubmit={submit}>
      <div className="cf-profile-section-heading">
        <h2>Link or update platform handles</h2>
        <button className="cf-profile-text-button" onClick={onCancel} type="button">
          Close
        </button>
      </div>
      <div className="cf-profile-handle-grid">
        {PROFILE_PLATFORMS.map(({ key, label }) => (
          <label className="cf-profile-field" key={key}>
            <span>{label}</span>
            <input
              autoComplete="off"
              className="cf-input"
              onChange={(event) => updateHandle(key, event.target.value)}
              value={handles[key]}
            />
            {errors[key] && <small className="cf-profile-error">{errors[key]}</small>}
          </label>
        ))}
      </div>
      {errors.form && <p className="cf-profile-error" role="alert">{errors.form}</p>}
      {error && <p className="cf-profile-error" role="alert">{error}</p>}
      <div className="cf-profile-form-actions">
        <span className="cf-muted">At least one valid public platform handle is required.</span>
        <button className="cf-button" disabled={busy} type="submit">
          {busy ? 'Syncing profiles…' : 'Save handles & sync'}
        </button>
      </div>
    </form>
  );
};

HandleLinkForm.propTypes = {
  initialHandles: PropTypes.oneOfType([
    PropTypes.objectOf(PropTypes.string),
    PropTypes.instanceOf(Map),
  ]),
  busy: PropTypes.bool,
  error: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

HandleLinkForm.defaultProps = {
  initialHandles: {},
  busy: false,
  error: '',
};

export default HandleLinkForm;
