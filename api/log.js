import { Octokit } from "octokit";

export default async function handler(req, res) {
  // 允许跨域（解决 Failed to fetch 的关键）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 处理预检请求（浏览器会先发 OPTIONS）
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 只允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 解析前端传来的 JSON
  const { ip, country, region, city, path } = req.body;

  if (!ip) {
    return res.status(400).json({ error: "Missing IP" });
  }

  // GitHub Token
  const GH_TOKEN = process.env.GH_TOKEN;
  if (!GH_TOKEN) {
    return res.status(500).json({ error: "GH_TOKEN missing" });
  }

  const octokit = new Octokit({ auth: GH_TOKEN });

  const owner = "always001";
  const repo = "hx-chat-data";
  const title = `访客记录 ${new Date().toLocaleString("zh-CN", { hour12: false })}`;

  try {
    // 创建 Issue
    const issue = await octokit.rest.issues.create({
      owner,
      repo,
      title,
      body: `IP: ${ip}\n国家: ${country}\n地区: ${region}\n城市: ${city}\n路径: ${path}`
    });

    // 添加评论
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.data.number,
      body: `访客来自 ${country} / ${city}`
    });

    return res.status(200).json({ ok: true, issue: issue.data.number });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
