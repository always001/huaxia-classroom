/**
 * 访问记录追踪器 - 独立模块
 * 100% 独立工作，不依赖 index.html
 */

(function() {
  // 1. 内置 GitHub 配置管理
  const GH = {
    get cfg() {
      try { return JSON.parse(localStorage.getItem('hx_gh_config') || '{}'); }
      catch (e) { return {}; }
    },
    hasAuth() {
      const c = this.cfg;
      return !!(c.user && c.token && c.chatRepo && c.visitRepo);
    }
  };
  window.GH = GH;

  // 2. GitHub API 封装
  async function ghFetch(url, options = {}) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(tid);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } catch (e) {
      clearTimeout(tid);
      throw e;
    }
  }

  // 3. 获取今日 Issue
  async function getTodayIssue(user, token, repo) {
    const date = new Date().toISOString().slice(0, 10);
    const title = '访客记录 ' + date;
    try {
      const r = await ghFetch(`https://api.github.com/repos/${user}/${repo}/issues?labels=visitor-log&state=open&per_page=10`, {
        headers: { 'Authorization': 'token ' + token }
      });
      const issues = JSON.parse(r);
      const existing = issues.find(i => i.title === title);
      if (existing) return existing;
      // 创建
      const cr = await ghFetch(`https://api.github.com/repos/${user}/${repo}/issues`, {
        method: 'POST',
        headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: '# ' + date, labels: ['visitor-log'] })
      });
      return JSON.parse(cr);
    } catch (e) {
      return null;
    }
  }

  // 4. 立即上传
  async function uploadVisit(user, token, repo, record) {
    const issue = await getTodayIssue(user, token, repo);
    if (!issue) return false;
    const body = `| ${record.time} | ${record.ip} | ${record.country} | ${record.region || ''} | ${record.city || ''} | ${record.ua || ''} | ${record.page || ''} |`;
    const r = await ghFetch(`https://api.github.com/repos/${user}/${repo}/issues/${issue.number}/comments`, {
      method: 'POST',
      headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    });
    return r.ok;
  }

  // 5. IP 获取（带 fallback）
  async function getIP() {
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

  // 6. 主函数
  async function logVisit() {
    if (!GH.hasAuth()) {
      console.warn('⚠️ GitHub 未配置');
      return;
    }
    const cfg = GH.cfg;
    try {
      const loc = await getIP();
      const record = {
        time: new Date().toISOString(),
        ip: loc.ip,
        country: loc.country,
        region: loc.region,
        city: loc.city,
        ua: navigator.userAgent.substring(0, 60),
        page: location.pathname
      };
      console.log('📤 正在上传访问记录...', record);
      const ok = await uploadVisit(cfg.user, cfg.token, cfg.visitRepo, record);
      if (ok) console.log('✅ 访问记录上传成功！');
    } catch (e) {
      console.error('❌ 访问记录失败:', e.message);
    }
  }

  // 7. 立即执行 + 暴露给手动调用
  logVisit();
  window.logVisit = logVisit;

  console.log('✅ visit-tracker.js 已加载');
})();
