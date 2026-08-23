/** Simple in-memory rate limiter for chat sends (per user). */

const SEND_LIMIT = 30;
const WINDOW_MS = 60_000;
const buckets = new Map();

function prune() {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.start > WINDOW_MS) buckets.delete(key);
  }
}

function allowSend(userId) {
  prune();
  const key = String(userId);
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    buckets.set(key, entry);
  }
  if (entry.count >= SEND_LIMIT) return false;
  entry.count += 1;
  return true;
}

module.exports = { allowSend, SEND_LIMIT, WINDOW_MS };
