import { useState } from 'react';
import PropTypes from 'prop-types';

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{1,50}$/;

const AuthForm = ({ mode, busy, error, onSubmit }) => {
  const [values, setValues] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [validationError, setValidationError] = useState('');
  const isRegister = mode === 'register';

  const updateValue = (event) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
    setValidationError('');
  };

  const submit = (event) => {
    event.preventDefault();
    if (!USERNAME_PATTERN.test(values.username.trim())) {
      setValidationError(
        'Username must be 1–50 characters using letters, numbers, dots, underscores or hyphens.',
      );
      return;
    }
    if (
      isRegister &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
    ) {
      setValidationError('Enter a valid email address.');
      return;
    }
    if (values.password.length < (isRegister ? 12 : 1)) {
      setValidationError(
        isRegister
          ? 'Choose a password with at least 12 characters.'
          : 'Enter your password.',
      );
      return;
    }
    onSubmit({
      username: values.username.trim().toLowerCase(),
      ...(isRegister ? { email: values.email.trim() } : {}),
      password: values.password,
    });
  };

  return (
    <form className="cf-auth-form" onSubmit={submit}>
      <label className="cf-profile-field">
        <span>Username</span>
        <input
          autoComplete="username"
          className="cf-input"
          name="username"
          onChange={updateValue}
          required
          value={values.username}
        />
      </label>
      {isRegister && (
        <label className="cf-profile-field">
          <span>Email</span>
          <input
            autoComplete="email"
            className="cf-input"
            name="email"
            onChange={updateValue}
            required
            type="email"
            value={values.email}
          />
        </label>
      )}
      <label className="cf-profile-field">
        <span>Password {isRegister && <small>(12 characters minimum)</small>}</span>
        <input
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          className="cf-input"
          minLength={isRegister ? 12 : 1}
          name="password"
          onChange={updateValue}
          required
          type="password"
          value={values.password}
        />
      </label>
      {(validationError || error) && (
        <p className="cf-status-error" role="alert">{validationError || error}</p>
      )}
      <button className="cf-button" disabled={busy} type="submit">
        {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
};

AuthForm.propTypes = {
  mode: PropTypes.oneOf(['login', 'register']).isRequired,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
};

AuthForm.defaultProps = { busy: false, error: null };

export default AuthForm;
