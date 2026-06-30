export default async function handler(req, res) {
  // ⭐ 允许 GitHub Pages 调用 Vercel API（跨域）
  res.setHeader("Access-Control-Allow-Origin", "https://always001.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

  // ⭐ 支持 GET + POST
  const page = req.query.page || req.body?.page || "未知";
  const referer = req.query.referer || req.body?.referer || "未知";
  const ua = req.query.ua || req.headers["user-agent"] || "";
  const ts = req.query.ts || Date.now();

  // ⭐ 更稳定的真实 IP 获取（中国访问也能拿到）
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket.remoteAddress ||
    "未知";

  // ⭐ 地理信息（失败也写入）
  let geo = { country: "未知", region: "", city: "", isp: "" };

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
    }
  } catch (e) {
    // 忽略错误，保持 geo 为默认值
  }

  // ⭐ Issue 标题按日期自动生成
  const today = new Date().toISOString().slice(0, 10);
  const issueTitle = `访客记录 ${today}`;

  // ⭐ 查找当天 Issue
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

  // ⭐ 如果当天 Issue 不存在则创建
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

  // ⭐ 写入记录（无论 IP 是否解析成功都写入）
  const now = new Date().toISOString();

  const body = `
| 时间 | IP | 国家 | 省份 | 城市 | 运营商 | 页面 | 来源页面 | UA |
|------|------|------|------|------|------|------|------|------|
| ${now} | ${ip} | ${geo.country} | ${geo.region} | ${geo.city} | ${geo.isp} | ${page} | ${referer} | ${ua.substring(0, 80)} |
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
