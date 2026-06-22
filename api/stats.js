import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const logs = (await kv.lrange("visit_logs", 0, -1)).map(JSON.parse);

  const byDay = {};
  const byCountry = {};
  const byPage = {};

  logs.forEach(log => {
    const day = log.time.slice(0, 10);

    byDay[day] = (byDay[day] || 0) + 1;
    byCountry[log.country] = (byCountry[log.country] || 0) + 1;
    byPage[log.url] = (byPage[log.url] || 0) + 1;
  });

  res.status(200).json({ byDay, byCountry, byPage });
}
