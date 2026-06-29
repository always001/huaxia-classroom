// /api/record-visit.js
// 安全后端版本：隐藏 GitHub Token，不暴露给前端

export default async function handler(req, res) {
  // 1. GitHub 配置（写死在后端是安全的）
  const GH_USER = "always001";
  const GH_REPO = "hx-visitor-data";
  const GH_TOKEN = process.env.GH_TOKEN;   // ⭐ 从环境变量读取（最安全）

  if (!GH_TOKEN) {
    return res.status(500).json({ error: "GH_TOKEN not set in environment variables" });
  }

  // 2. 获取客户端 IP（Vercel 自动提供）
  const ip = req.headers["x-real-ip"] ||
             req.headers["x-forwarded-for"] ||
             req.socket.remoteAddress ||
             "未知";

  // 3. 获取地理位置（使用 ipapi.co）
  let geo = {};
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`);
    geo = await r.json();
  } catch (e) {
    geo = { country: "未知", region: "", city: "" };
  }

  // 4. 获取今天的 Issue 标题
  const today = new Date().toISOString().slice(0, 10);
  const issueTitle = `访客记录 ${today}`;

  // 5. 查找今天的 Issue 是否已存在
  let issue;
  try {
    const r = await fetch(
      `https://api.github.com/repos/${GH_USER}/${GH_REPO}/issues?labels=visitor-log&state=open&per_page=20`,
      {
        headers: { Authorization: `token ${GH_TOKEN}` }
      }
    );
    const issues = await r.json();
    issue = issues.find(i => i.title === issueTitle);
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch issues", detail: e.message });
  }

  // 6. 如果不存在，创建新的 Issue
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

  // 7. 生成访问记录内容
  const now = new Date().toISOString();
  const body = `| ${now} | ${ip} | ${geo.country} | ${geo.region} | ${geo.city} | ${req.headers["user-agent"]?.substring(0, 80)} | ${req.headers["referer"] || "未知页面"} |`;

  // 8. 写入评论
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

  // 9. 返回成功
  res.status(200).json({ ok: true, issue: issue.number });
}
