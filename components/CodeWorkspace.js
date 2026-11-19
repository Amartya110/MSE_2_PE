import Link from 'next/link';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addTestCase,
  initializeProblem,
  removeTestCase,
  runCode,
  setLanguage,
  setSourceCode,
  setTestCase,
} from '../store/editorSlice.js';

const LANGUAGES = [
  { value: 'cpp', label: 'C++17 (GNU G++17)' },
  { value: 'python', label: 'Python 3' },
  { value: 'java', label: 'Java 17' },
  { value: 'javascript', label: 'Node.js' },
];

const CodeWorkspace = ({ problem }) => {
  const dispatch = useDispatch();
  const editor = useSelector((state) => state.editor);
  const auth = useSelector((state) => state.auth);
  const [clipboardMessage, setClipboardMessage] = useState('');
  const code = editor.codeByLanguage[editor.language] ?? '';

  useEffect(() => {
    dispatch(initializeProblem({ problem }));
  }, [dispatch, problem]);

  const copyCode = async () => {
    if (!navigator.clipboard) {
      setClipboardMessage('Clipboard unavailable; select and copy the source directly.');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setClipboardMessage('Source copied. Paste it into the platform submission form.');
    } catch {
      setClipboardMessage('Clipboard access was denied; select and copy the source directly.');
    }
  };

  const runSample = () => {
    if (auth.status === 'authenticated') dispatch(runCode());
  };

  return (
    <main className="cf-workspace">
      <div className="cf-workspace-breadcrumb">
        <Link href="/problemset">Problemset</Link>
        <span> / {problem.platform} / </span>
        <strong className="cf-mono">{problem.problemId}</strong>
      </div>
      <div className="cf-workspace-title">
        <div>
          <p className="cf-muted">
            {problem.platform.toUpperCase()} · {problem.difficulty || 'Unrated'}
          </p>
          <h1>{problem.title}</h1>
        </div>
        <div className="cf-workspace-problem-actions">
          <span className="cf-workspace-rating">
            Rating: {problem.rating ?? 'Unrated'}
          </span>
          {problem.url && (
            <a href={problem.url} rel="noreferrer" target="_blank">
              Original statement ↗
            </a>
          )}
        </div>
      </div>
      <div className="cf-workspace-tags">
        {(problem.tags ?? []).map((tag) => <span className="cf-tag" key={tag}>{tag}</span>)}
      </div>

      <div className="cf-workspace-grid">
        <section className="cf-workspace-pane">
          <h2>Problem statement</h2>
          <p className="cf-workspace-statement">
            {problem.statement || 'Use standard input and output to solve this problem.'}
          </p>
          <h2>Sample input / output</h2>
          {problem.sampleTestCases?.length ? (
            <div className="cf-table-wrap">
              <table className="cf-table cf-sample-table">
                <thead>
                  <tr><th>#</th><th>Input</th><th>Expected output</th></tr>
                </thead>
                <tbody>
                  {problem.sampleTestCases.map((testCase, index) => (
                    <tr key={`${index}-${testCase.input}`}>
                      <td className="cf-mono">{index + 1}</td>
                      <td><pre>{testCase.input}</pre></td>
                      <td><pre>{testCase.expectedOutput || '—'}</pre></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="cf-muted">No sample cases are available. Add custom input below.</p>
          )}
        </section>

        <section className="cf-workspace-pane cf-editor-pane">
          <div className="cf-editor-toolbar">
            <label>
              <span>Language</span>
              <select
                className="cf-input"
                onChange={(event) => dispatch(setLanguage(event.target.value))}
                value={editor.language}
              >
                {LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>{language.label}</option>
                ))}
              </select>
            </label>
            <div className="cf-editor-buttons">
              <button className="cf-button" onClick={copyCode} type="button">Copy code</button>
              {problem.url && (
                <a className="cf-button" href={problem.url} rel="noreferrer" target="_blank">
                  Submit to platform ↗
                </a>
              )}
              <button
                className="cf-button cf-run-button"
                disabled={
                  auth.status !== 'authenticated' ||
                  editor.execution.status === 'running'
                }
                onClick={runSample}
                type="button"
              >
                {editor.execution.status === 'running'
                  ? 'Running…'
                  : auth.status === 'authenticated'
                    ? 'Run sample'
                    : 'Sign in to run'}
              </button>
            </div>
          </div>
          {clipboardMessage && <p className="cf-notice" role="status">{clipboardMessage}</p>}
          {auth.status !== 'authenticated' && (
            <p className="cf-muted">
              Code execution requires an account. <Link href="/login">Sign in</Link>.
            </p>
          )}
          {editor.execution.error && (
            <p className="cf-status-error" role="alert">{editor.execution.error}</p>
          )}
          <label className="cf-code-label">
            <span>Source code</span>
            <textarea
              aria-label={`${LANGUAGES.find((item) => item.value === editor.language)?.label} source code`}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              className="cf-code-editor"
              maxLength={20 * 1024}
              onChange={(event) => dispatch(setSourceCode(event.target.value))}
              spellCheck="false"
              value={code}
            />
          </label>

          <section className="cf-workspace-console">
            <div className="cf-profile-section-heading">
              <h2>Test console</h2>
              <button
                className="cf-profile-text-button"
                disabled={editor.testCases.length >= 3}
                onClick={() => dispatch(addTestCase())}
                type="button"
              >
                + Add test case
              </button>
            </div>
            {editor.testCases.map((testCase, index) => {
              const result = editor.execution.result?.testCases?.find(
                (item) => item.index === index,
              );
              return (
                <article className="cf-test-case" key={testCase.id}>
                  <div className="cf-test-case-heading">
                    <strong>Test {index + 1}</strong>
                    {result && (
                      <span className={`cf-test-verdict cf-test-verdict-${result.outcome.replace(/\s+/g, '-').toLowerCase()}`}>
                        {result.outcome}
                      </span>
                    )}
                    {editor.testCases.length > 1 && (
                      <button
                        className="cf-profile-text-button"
                        onClick={() => dispatch(removeTestCase(testCase.id))}
                        type="button"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="cf-test-inputs">
                    <label>
                      <span>Standard input</span>
                      <textarea
                        maxLength={4096}
                        onChange={(event) =>
                          dispatch(setTestCase({
                            id: testCase.id,
                            field: 'input',
                            value: event.target.value,
                          }))
                        }
                        value={testCase.input}
                      />
                    </label>
                    <label>
                      <span>Expected output</span>
                      <textarea
                        maxLength={4096}
                        onChange={(event) =>
                          dispatch(setTestCase({
                            id: testCase.id,
                            field: 'expectedOutput',
                            value: event.target.value,
                          }))
                        }
                        value={testCase.expectedOutput}
                      />
                    </label>
                  </div>
                  {result && (
                    <div className="cf-test-result">
                      <div>
                        <strong>Program output</strong>
                        <pre>{result.stdout || result.stderr || result.compileOutput || result.message || 'No output'}</pre>
                      </div>
                      <div>
                        <strong>Runtime / memory</strong>
                        <pre>{`${result.time ?? '—'} s / ${result.memory ?? '—'} KB`}</pre>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            {editor.execution.result && (
              <p className="cf-workspace-run-summary" role="status">
                {editor.execution.result.status === 'passed'
                  ? 'All sample tests passed.'
                  : editor.execution.result.status === 'executed'
                    ? 'Execution finished; expected output was not supplied for every case.'
                    : 'Execution finished. Review each test result.'}
                {' · '}{editor.execution.result.durationMs} ms
              </p>
            )}
          </section>
          <p className="cf-muted cf-submit-note">
            Platform submission is a manual handoff; your session cookies are never collected.
          </p>
        </section>
      </div>
    </main>
  );
};

CodeWorkspace.propTypes = {
  problem: PropTypes.shape({
    platform: PropTypes.string.isRequired,
    problemId: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    rating: PropTypes.number,
    difficulty: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    url: PropTypes.string,
    statement: PropTypes.string,
    sampleTestCases: PropTypes.arrayOf(
      PropTypes.shape({
        input: PropTypes.string.isRequired,
        expectedOutput: PropTypes.string,
      }),
    ),
  }).isRequired,
};

export default CodeWorkspace;
