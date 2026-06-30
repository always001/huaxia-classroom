export default async function handler(req, res) {
  // ⭐ 允许 GitHub Pages 调用 Vercel API（跨域）
  //res.setHeader("Access-Control-Allow-Origin", "https://always001.github.io");
  const origin = req.headers.origin;

  const allowedOrigins = [
    "https://always001.github.io",
    "https://huaxia-classroom.vercel.app",
    "https://huaxia-classroom-pzaxy2fv6-fengling350300-2749s-projects.vercel.app"
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GH_USER = "always001";
  const GH_REPO = "hx-visitor-data";
  const GH_TOKEN = process.env.GH_TOKEN;

  if (!GH_TOKEN) {
    return res.status(500).json({ error: "GH_TOKEN not set in environment variables" });
  }

  const { page, referer } = req.body || {};

  /*
  const ip =
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "未知";
  */
  let ip =
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "未知";

  if (typeof ip === "string" && ip.includes(",")) {
    ip = ip.split(",")[0].trim(); // 取第一个真实客户端 IP
  }

  // ⭐ 稳定 IP 解析（ipwho.is + fallback）
  let geo = {};

  try {
    const r1 = await fetch(`https://ipwho.is/${ip}`);
    const g1 = await r1.json();

    if (g1.success !== false) {
      geo = {
        country: g1.country || "未知",
        region: g1.region || g1.city || "",
        city: g1.city || "",
        isp: g1.connection?.isp || ""
      };
    } else {
      throw new Error("ipwho.is failed");
    }
  } catch (e) {
    try {
      const r2 = await fetch(`https://ipapi.co/${ip}/json/`);
      const g2 = await r2.json();

      geo = {
        country: g2.country_name || "未知",
        region: g2.region || "",
        city: g2.city || "",
        isp: g2.org || ""
      };
    } catch (e2) {
      geo = { country: "未知", region: "", city: "", isp: "" };
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const issueTitle = `访客记录 ${today}`;

  let issue;
  try {
    const r = await fetch(
      `https://api.github.com/repos/${GH_USER}/${GH_REPO}/issues?labels=visitor-log&state=open&per_page=20`,
      { headers: { Authorization: `token ${GH_TOKEN}` } }
    );
    const issues = await r.json();
    issue = issues.find(i => i.title === issueTitle);
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch issues", detail: e.message });
  }

  if (!issue) {
    const r = await fetch(
      `https://api.github.com/repos/${GH_USER}/${GH_REPO}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${GH_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: issueTitle,
          body: `# ${today}`,
          labels: ["visitor-log"]
        })
      }
    );
    issue = await r.json();
  }

  const now = new Date().toISOString();

  const body = `
| 时间 | IP | 国家 | 省份 | 城市 | 运营商 | 页面 | 来源页面 | UA |
|------|------|------|------|------|------|------|------|------|
| ${now} | ${ip} | ${geo.country} | ${geo.region} | ${geo.city} | ${geo.isp} | ${page || "未知"} | ${referer || "未知"} | ${req.headers["user-agent"]?.substring(0, 80)} |
`;

  try {
    await fetch(
      `https://api.github.com/repos/${GH_USER}/${GH_REPO}/issues/${issue.number}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${GH_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ body })
      }
    );
  } catch (e) {
    return res.status(500).json({ error: "Failed to write comment", detail: e.message });
  }

  res.status(200).json({ ok: true, issue: issue.number });
}
