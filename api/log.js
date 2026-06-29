export default async function handler(req, res) {
  const { ip, country, region, city, path } = req.body;

  const token = process.env.GH_TOKEN; // 放在 Vercel 环境变量里
  const repo = "hx-visitor-data";
  const user = "always001";

  const date = new Date().toISOString().slice(0, 10);
  const title = `访客记录 ${date}`;

  // 查找或创建 Issue
  let issue;
  {
    const r = await fetch(`https://api.github.com/repos/${user}/${repo}/issues?labels=visitor-log&state=open&per_page=10`, {
      headers: { Authorization: `token ${token}` }
    });
    const issues = await r.json();
    issue = Array.isArray(issues) ? issues.find(i => i.title === title) : null;

    if (!issue) {
      const cr = await fetch(`https://api.github.com/repos/${user}/${repo}/issues`, {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          body: `# ${date}`,
          labels: ["visitor-log"]
        })
      });
      issue = await cr.json();
    }
  }

  // 添加评论
  const now = new Date().toISOString();
  const body = `| ${now} | ${ip} | ${country} | ${region} | ${city} | | ${path} |`;

  await fetch(`https://api.github.com/repos/${user}/${repo}/issues/${issue.number}/comments`, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });

  res.status(200).json({ ok: true });
}
