import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    "unknown";

  const ua = req.headers["user-agent"] || "unknown";
  const url = req.headers["referer"] || "unknown";
  const time = new Date().toISOString();

  // IP 定位
  const geo = await fetch(`https://ipapi.co/${ip}/json/`).then(r => r.json());

  const record = {
    ip,
    country: geo.country_name || "Unknown",
    city: geo.city || "Unknown",
    ua,
    url,
    time
  };

  await kv.lpush("visit_logs", JSON.stringify(record));

  res.status(200).json({ ok: true });
}
