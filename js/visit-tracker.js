/**
 * 访问记录追踪器 - 纯前端 + CORS 代理版本
 * 可在中国、日本、美国、任何国家成功写入 GitHub Issues
 */

async function _vtGetIP() {
  const sources = [
    'https://ipwho.is/',
    'http://ip-api.com/json/?lang=zh-CN',
    'https://ipapi.co/json/'
  ];
  for (const url of sources) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!r.ok) continue;
      const d = await r.json();
      if (url.includes('ipwho.is') && d.success === false) continue;
      if (url.includes('ip-api.com') && d.status !== 'success') continue;
      return {
        ip: d.ip || d.query || '未知',
        country: d.country || d.country_name || '未知',
        region: d.region || d.regionName || '',
        city: d.city || ''
      };
    } catch (e) { continue; }
  }
  return { ip: '未知', country: '未知', region: '', city: '' };
}

async function _vtGetTodayIssue(user, token, repo) {
  const date = new Date().toISOString().slice(0, 10);
  const title = '访客记录 ' + date;

  try {
    // ⭐ 使用 CORS 代理绕过 GitHub 限制
    const r = await fetch(
      `https://cors.isomorphic-git.org/https://api.github.com/repos/${user}/${repo}/issues?labels=visitor-log&state=open&per_page=10`,
      { headers: { 'Authorization': 'token ' + token } }
    );

    const issues = await r.json();
    const existing = issues.find(i => i.title === title);
    if (existing) return existing;

    // ⭐ 创建新的 Issue（同样必须走 CORS 代理）
    const cr = await fetch(
      `https://cors.isomorphic-git.org/https://api.github.com/repos/${user}/${repo}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'token ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          body: '# ' + date,
          labels: ['visitor-log']
        })
      }
    );

    return await cr.json();
  } catch (e) {
    console.warn('Issue 创建失败:', e);
    return null;
  }
}

async function visitTracker() {
  const cfg = JSON.parse(localStorage.getItem('hx_gh_config') || '{}');
  if (!cfg.user || !cfg.token || !cfg.visitRepo) return;

  try {
    const loc = await _vtGetIP();
    const issue = await _vtGetTodayIssue(cfg.user, cfg.token, cfg.visitRepo);
    if (!issue) return;

    const now = new Date().toISOString();
    const body = `| ${now} | ${loc.ip} | ${loc.country} | ${loc.region||''} | ${loc.city||''} | ${navigator.userAgent.substring(0,60)} | ${location.pathname} |`;

    // ⭐ 写评论也必须走 CORS 代理
    await fetch(
      `https://cors.isomorphic-git.org/https://api.github.com/repos/${cfg.user}/${cfg.visitRepo}/issues/${issue.number}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'token ' + cfg.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body })
      }
    );
  } catch (e) {
    console.warn('visitTracker:', e.message);
  }
}

// 立即执行
visitTracker();
