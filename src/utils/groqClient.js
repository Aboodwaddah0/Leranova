const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const groqFetchWithRetry = async (url, fetchOptions = {}, opts = {}) => {
  const retries = Number(opts.retries ?? 3);
  const baseDelay = Number(opts.baseDelay ?? 500);

  let lastResponse = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);
      lastResponse = res;

      // If not a transient rate/502 error, return immediately
      if (res.status !== 429 && res.status !== 502) return res;

      // If we've exhausted retries, return the last response so caller can handle
      if (attempt === retries) return res;

      // Honor Retry-After header when present (seconds)
      const ra = res.headers.get('retry-after');
      let delay = baseDelay * Math.pow(2, attempt);
      if (ra && !Number.isNaN(Number(ra))) {
        delay = Math.max(delay, Number(ra) * 1000);
      }

      // Add some jitter
      delay = Math.floor(delay + (Math.random() * delay) * 0.3);

      await sleep(delay);
      continue;
    } catch (err) {
      // Network or abort errors: if last attempt, rethrow; else wait and retry
      if (attempt === retries) throw err;
      const delay = Math.floor(baseDelay * Math.pow(2, attempt) + Math.random() * 200);
      await sleep(delay);
      continue;
    }
  }

  return lastResponse;
};

export default groqFetchWithRetry;
