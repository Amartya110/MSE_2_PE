export const apiRequest = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(
      `Could not connect to the API: ${error.message}`,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload.error?.message ?? `API request failed (${response.status}).`;
    const requestId = response.headers.get('x-request-id');
    const responseType = response.headers
      .get('content-type')
      ?.split(';', 1)[0];
    const diagnostic =
      response.status >= 500
        ? requestId
          ? ` Request ID: ${requestId}.`
          : responseType
            ? ` Response type: ${responseType}.`
            : ''
        : '';
    throw new Error(`${message}${diagnostic}`);
  }
  return payload;
};
