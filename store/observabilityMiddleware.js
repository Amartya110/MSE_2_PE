const writeExecutionEvent = (level, event) => {
  if (typeof console[level] !== 'function') return;
  console[level](JSON.stringify(event));
};

export const observabilityMiddleware = ({ getState }) => (next) => (action) => {
  const result = next(action);

  if (action.type === 'editor/run/fulfilled') {
    const execution = action.payload;
    writeExecutionEvent('info', {
      event: 'execution.completed',
      requestId: action.meta.requestId,
      runId: execution.runId,
      platform: execution.platform,
      problemId: execution.problemId,
      language: execution.language,
      status: execution.status,
      durationMs: execution.durationMs,
    });
  } else if (action.type === 'editor/run/rejected') {
    const problem = getState().editor.problem;
    writeExecutionEvent('warn', {
      event: 'execution.failed',
      requestId: action.meta.requestId,
      platform: problem?.platform,
      problemId: problem?.problemId,
    });
  }

  return result;
};
