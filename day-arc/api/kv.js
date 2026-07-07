import { Redis } from '@upstash/redis';

// Vercel's Upstash Marketplace integration has injected credentials under
// different env var names depending on how the database was connected -
// check both so this works either way.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error('Missing Redis credentials - connect an Upstash Redis database to this project in the Storage tab.');
}

const kv = new Redis({ url, token });

// Very small "auth": everything is namespaced by whatever passphrase the
// client sends in the x-pin header. Same passphrase => same data.
// This is NOT real authentication (no password hashing, no accounts) -
// it's just a shared namespace, appropriate for a single-user personal
// tracker. Don't reuse a sensitive password as the passphrase.

function scopeFor(pin, shared) {
  if (shared === 'true') return 'shared';
  if (!pin || typeof pin !== 'string' || pin.length < 4) return null;
  return `user:${pin}`;
}

export default async function handler(req, res) {
  if (!url || !token) {
    res.status(500).json({ error: 'No Redis database connected. Add an Upstash Redis database in the Vercel Storage tab.' });
    return;
  }

  const pin = req.headers['x-pin'];
  const { key, shared, prefix, list } = req.query;

  const scope = scopeFor(pin, shared);
  if (!scope) {
    res.status(400).json({ error: 'Missing or invalid passphrase' });
    return;
  }

  try {
    if (req.method === 'GET') {
      if (list === 'true') {
        const pattern = `${scope}:${prefix || ''}*`;
        const keys = await kv.keys(pattern);
        const stripped = keys.map(k => k.slice(scope.length + 1));
        res.status(200).json({ keys: stripped, prefix: prefix || undefined, shared: shared === 'true' });
        return;
      }
      if (!key) {
        res.status(400).json({ error: 'Missing key' });
        return;
      }
      const value = await kv.get(`${scope}:${key}`);
      if (value === null || value === undefined) {
        res.status(404).json({ error: 'not found' });
        return;
      }
      res.status(200).json({ key, value, shared: shared === 'true' });
      return;
    }

    if (req.method === 'POST') {
      const { key: bodyKey, value } = req.body || {};
      if (!bodyKey) {
        res.status(400).json({ error: 'Missing key' });
        return;
      }
      await kv.set(`${scope}:${bodyKey}`, value);
      res.status(200).json({ key: bodyKey, value, shared: shared === 'true' });
      return;
    }

    if (req.method === 'DELETE') {
      if (!key) {
        res.status(400).json({ error: 'Missing key' });
        return;
      }
      await kv.del(`${scope}:${key}`);
      res.status(200).json({ key, deleted: true, shared: shared === 'true' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'storage error' });
  }
}
