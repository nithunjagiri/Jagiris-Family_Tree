/**
 * Normalize axios/API error payloads to a string safe for JSX (avoids React #31 when `error` is an object).
 */
export function getApiErrorMessage(err, fallback = 'Something went wrong.') {
  const data = err?.response?.data;
  if (!data) {
    if (err?.code === 'ERR_NETWORK') return 'Cannot reach server. Is the backend running?';
    return typeof err?.message === 'string' && err.message.trim() ? err.message : fallback;
  }

  const top = data.error;
  if (typeof top === 'string' && top.trim()) return top;
  if (top && typeof top === 'object' && typeof top.message === 'string' && top.message.trim()) return top.message;

  if (Array.isArray(data.errors) && data.errors.length) {
    const first = data.errors[0];
    if (typeof first === 'string' && first.trim()) return first;
    if (first && typeof first.msg === 'string' && first.msg.trim()) return first.msg;
  }

  if (typeof data.message === 'string' && data.message.trim()) return data.message;

  return fallback;
}
