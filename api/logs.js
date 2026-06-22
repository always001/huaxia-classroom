import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const logs = await kv.lrange("visit_logs", 0, -1);
  res.status(200).json(logs.map(JSON.parse));
}
