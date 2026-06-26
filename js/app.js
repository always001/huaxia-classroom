// ================================================================
// ✅ 兜底：确保所有依赖都存在
// ================================================================
if (typeof window.GH === 'undefined') {
  window.GH = {
    get cfg() { try { return JSON.parse(localStorage.getItem('hx_gh_config') || '{}'); } catch(e) { return {}; } },
    set cfg(v) { try { localStorage.setItem('hx_gh_config', JSON.stringify(v)); } catch(e) {} },
    hasAuth() { const c = this.cfg; return !!(c.user && c.token && c.chatRepo && c.visitRepo); }
  };
}
if (typeof window.getPinyinRaw === 'undefined') {
  window.getPinyinRaw = function(ch) { return window.PINYIN_DATA?.[ch] || null; };
}
if (typeof window.toTonedPinyin === 'undefined') {
  window.toTonedPinyin = function(p) { return p || ''; };
}
if (typeof window.TONE_MAP_DATA === 'undefined') {
  window.TONE_MAP_DATA = {};
}


class HuaXiaTTS {
  // ... 原代码
}


class HuaXiaTTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null; this.ready = false; this.onReadyCallbacks = [];
    this.statusEl = document.getElementById('tts-status');
    this._init();
  }
  _init() {
    const load = () => { const voices = this.synth.getVoices(); if (!voices.length) return false; this.voice = voices.find(v => /zh/i.test(v.lang) && /Xiaoxiao|Mei|Ting|女|female/i.test(v.name)) || voices.find(v => /zh/i.test(v.lang)); this.ready = !!this.voice; if (this.ready) { this.onReadyCallbacks.forEach(cb => cb()); this.onReadyCallbacks = []; } return this.ready; };
    if (!load()) { this.synth.addEventListener('voiceschanged', load); let n = 0; const t = setInterval(() => { if (load() || ++n > 20) clearInterval(t); }, 200); }
  }
  onReady(cb) { this.ready ? cb() : this.onReadyCallbacks.push(cb); }
  speak(text, options = {}) { if (!text) return; if (!this.ready) { this.onReady(() => this._speakNow(text, options)); return; } this._speakNow(text, options); }
  _speakNow(text, options = {}) { this.synth.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = this.voice; u.lang = this.voice.lang || 'zh-CN'; u.rate = options.rate ?? 0.85; if (this.statusEl) this.statusEl.style.display = 'block'; u.onend = u.onerror = () => { if (this.statusEl) this.statusEl.style.display = 'none'; if (options.onEnd) options.onEnd(); }; this.synth.speak(u); }
  stop() { this.synth.cancel(); if (this.statusEl) this.statusEl.style.display = 'none'; }
}

class TianZiGe {
  constructor(char, pinyin = '') { this.char = char; this.pinyin = pinyin; }
  render(container) {
    const word = document.createElement('div'); word.className = 'tianzige-word'; word.title = '点我读：' + this.char;
    const py = document.createElement('div'); py.className = 'pinyin-text'; py.textContent = this.pinyin || ' '; word.appendChild(py);
    const cell = document.createElement('div'); cell.className = 'tianzige-cell'; cell.textContent = this.char; word.appendChild(cell);
    word.onclick = e => { e.stopPropagation(); cell.classList.add('highlight'); setTimeout(() => cell.classList.remove('highlight'), 600); window.tts && window.tts.speak(this.char); };
    container.appendChild(word); return word;
  }
}

class PinyinLine {
  constructor(text) { this.text = text; this.words = this._build(); }
  _build() {
    const words = [];
    for (const ch of this.text) {
      if (/[\u4e00-\u9fa5]/.test(ch)) {
        const pinyinRaw = window.getPinyinRaw(ch);
        const tone = window.TONE_MAP_DATA[ch] !== undefined ? window.TONE_MAP_DATA[ch] : 1;
        const tonedPinyin = pinyinRaw ? window.toTonedPinyin(pinyinRaw, tone) : '';
        words.push({ char: ch, pinyin: tonedPinyin });
      } else if (/[\s，。！？、；：""''《》（）]/.test(ch)) {
        words.push({ char: ch, isPunct: true });
      }
    }
    return words;
  }
  render(container) {
    const line = document.createElement('div'); line.className = 'pinyin-line';
    for (const w of this.words) {
      if (w.isPunct) { const span = document.createElement('span'); span.className = 'punct'; span.textContent = w.char; line.appendChild(span); }
      else { new TianZiGe(w.char, w.pinyin).render(line); }
    }
    container.appendChild(line); return line;
  }
}

class HuaXiaApp {
  init() {
    try { this.renderHome(); }
    catch (e) { console.error('renderHome err:', e); }

    // ✨ 加这一行：触发访问记录
    setTimeout(() => this._logVisit(), 100);
  
    safeAsync(() => this._loadLocation());
    safeAsync(() => this._initTTS());
  }


  // 🎯 终极简化版：每次访问立即记录，绝不丢
  async _logVisit() {
    try {
      const loc = await this._getLocWithCache();
      localStorage.setItem('hx_my_loc', JSON.stringify(loc));
      const el = document.getElementById('my-location');
      if (el) el.textContent = loc.country === '未知' ? '🌍 位置暂不可用' : `🌍 ${loc.country}${loc.region ? '·' + loc.region : ''}${loc.city ? '·' + loc.city : ''}`;

      // ✅ 直接尝试上传（不缓存、不去重、不延迟）
      if (window.GH && window.GH.hasAuth()) {
        const record = { time: new Date().toISOString(), ip: loc.ip, country: loc.country, region: loc.region, city: loc.city, ua: navigator.userAgent.substring(0, 60), page: '/' };
        
        // 立即上传（不等 5 秒）
        this._uploadVisit(record).catch(e => {
          // 上传失败，存到 localStorage
          this._savePending(record);
        });
      }
    } catch (e) { console.warn('log visit:', e); }
  }

  // ✅ 失败降级
  _savePending(record) {
    try {
      const pending = JSON.parse(localStorage.getItem('hx_visit_pending') || '[]');
      pending.push(record);
      // 只保留最近 50 条
      if (pending.length > 50) pending.splice(0, pending.length - 50);
      localStorage.setItem('hx_visit_pending', JSON.stringify(pending));
      // 10 秒后重试
      setTimeout(() => this._flushPending(), 10000);
    } catch (e) {}
  }

  _flushPending() {
    try {
      const pending = JSON.parse(localStorage.getItem('hx_visit_pending') || '[]');
      if (pending.length === 0) return;
      const cfg = window.GH.cfg;
      if (!cfg.user || !cfg.token) return;
      
      // 逐条上传
      (async () => {
        const success = [];
        for (const r of pending) {
          try {
            await this._uploadOne(r);
            success.push(r);
          } catch (e) { break; }
        }
        // 移除成功的
        if (success.length > 0) {
          const remain = pending.filter(r => !success.includes(r));
          localStorage.setItem('hx_visit_pending', JSON.stringify(remain));
        }
      })();
    } catch (e) {}
  }

  // ✅ 立即上传一条
_uploadVisit(record) {
  // 用 async/await 写法，避免 Promise 嵌套混乱
  return (async () => {
    const cfg = window.GH.cfg || {};
    console.log('🚀 [访问记录] 开始上传:', record.ip, record.country);
    
    if (!cfg.user || !cfg.token) {
      console.warn('⚠️ [访问记录] GitHub 未配置');
      this._savePending(record);
      return;
    }
    
    let issue;
    try {
      issue = await this._getTodayIssue();
      console.log('📌 [访问记录] Issue:', issue);
    } catch (e) {
      console.error('❌ [访问记录] 获取 Issue 失败:', e.message);
      this._savePending(record);
      return;
    }
    
    if (!issue || !issue.number) {
      console.warn('⚠️ [访问记录] Issue 不存在');
      this._savePending(record);
      return;
    }
    
    try {
      const url = `https://api.github.com/repos/${cfg.user}/${cfg.visitRepo}/issues/${issue.number}/comments`;
      console.log('🌐 [访问记录] POST 到:', url);
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `token ${cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: this._formatRecord(record) })
      });
      console.log('📡 [访问记录] 响应:', resp.status, resp.statusText);
      if (!resp.ok) {
        const errText = await resp.text();
        console.error('❌ [访问记录] 上传失败:', errText);
        this._savePending(record);
      } else {
        console.log('✅ [访问记录] 上传成功！');
      }
    } catch (e) {
      console.error('❌ [访问记录] 网络错误:', e.message);
      this._savePending(record);
    }
  })();
}

_formatRecord(record) {
  return `| ${record.time} | ${record.ip} | ${record.country} | ${record.region || ''} | ${record.city || ''} | ${record.ua || ''} | ${record.page || ''} |`;
}


  async _uploadOne(record, issueNum) {
    const cfg = window.GH.cfg;
    if (!issueNum) issueNum = (await this._getTodayIssue())?.number;
    if (!issueNum) throw new Error('无 Issue 编号');
    const body = `| ${record.time} | ${record.ip} | ${record.country} | ${record.region || ''} | ${record.city || ''} | ${record.ua || ''} | ${record.page || ''} |`;
    await this._ghFetch(`https://api.github.com/repos/${cfg.user}/${cfg.visitRepo}/issues/${issueNum}/comments`, {
      method: 'POST',
      headers: { 'Authorization': `token ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    });
  }

  async _getTodayIssue() {
    const date = new Date().toISOString().slice(0, 10);
    const cacheKey = 'hx_visit_issue_' + date;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { try { return JSON.parse(cached); } catch (e) {} }
    const cfg = window.GH.cfg;
    try {
      const r = await this._ghFetch(`https://api.github.com/repos/${cfg.user}/${cfg.visitRepo}/issues?labels=visitor-log&state=open&per_page=10`);
      const issues = JSON.parse(r);
      let issue = issues.find(i => i.title === `访客记录 ${date}`);
      if (issue) { localStorage.setItem(cacheKey, JSON.stringify({ number: issue.number, date })); return { number: issue.number, date }; }
      const cr = await this._ghFetch(`https://api.github.com/repos/${cfg.user}/${cfg.visitRepo}/issues`, { method: 'POST', headers: { 'Authorization': `token ${cfg.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `访客记录 ${date}`, body: `# ${date} 访客日志`, labels: ['visitor-log'] }) });
      issue = JSON.parse(cr);
      localStorage.setItem(cacheKey, JSON.stringify({ number: issue.number, date }));
      return { number: issue.number, date };
    } catch (e) { return null; }
  }

  _ghFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      const ctrl = new AbortController();
      const tid = setTimeout(() => { ctrl.abort(); reject(new Error('超时')); }, 15000);
      fetch(url, { ...options, signal: ctrl.signal })
        .then(r => { clearTimeout(tid); if (!r.ok) { reject(new Error('HTTP ' + r.status)); return; } return r.text(); })
        .then(t => { clearTimeout(tid); resolve(t); })
        .catch(e => { clearTimeout(tid); reject(e); });
    });
  }

  async _getLocWithCache() {
    const cached = JSON.parse(localStorage.getItem('hx_my_loc') || 'null');
    if (cached && Date.now() - (cached._t || 0) < 24 * 60 * 60 * 1000) return cached;
    const sources = ['https://ipwho.is/', 'http://ip-api.com/json/?lang=zh-CN', 'https://ipapi.co/json/'];
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
        return { ip: d.ip || d.query || '未知', country: d.country || d.country_name || '未知', region: d.region || d.regionName || '', city: d.city || '', _t: Date.now() };
      } catch (e) { continue; }
    }
    return { ip: '未知', country: '未知', region: '', city: '', _t: Date.now() };
  }

  // ===== 以下代码完全不动 =====
  renderHome() {
    document.getElementById('app').innerHTML = `
      <div class="home-header">
        <h1>🏮 华夏小课堂</h1>
        <p style="margin:12px 0 0;opacity:0.95;">读中国故事 · 传中华文化</p>
        <button class="welcome-btn" id="welcome-btn">🔊 点我听介绍</button>
      </div>
      <div style="text-align:center;padding:8px 20px;font-size:13px;color:#666;" id="my-location">🌍 正在定位...</div>
      <div class="quick-actions">
        <button class="qa-btn" onclick="app.openSetup()">⚙️ 配置</button>
        <button class="qa-btn" onclick="app.openVideo()">📹 视频课堂</button>
        <button class="qa-btn" onclick="app.openChat()">💬 跨境聊天</button>
        <button class="qa-btn" onclick="app.openGlobe()">🌍 世界地图</button>
        <button class="qa-btn" onclick="app.openStudy()">📊 学习记录</button>
        <button class="qa-btn" onclick="app.togglePinyin()" id="pinyin-toggle">👁️ 隐藏拼音</button>
      </div>
      <div class="categories" id="categories"></div>
      <footer style="text-align:center;padding:30px;color:#888;font-size:13px;">🌟 华夏小课堂 · <a href="admin/" style="color:#5e35b1;">教师后台</a></footer>
    `;
    document.getElementById('welcome-btn').onclick = () => { if (window.tts) window.tts.speak('你好小朋友，欢迎来到华夏小课堂！'); };
    const loc = JSON.parse(localStorage.getItem('hx_my_loc') || 'null');
    const locEl = document.getElementById('my-location');
    if (locEl && loc && loc.country && loc.country !== '未知') locEl.textContent = `🌍 ${loc.country}${loc.region ? '·' + loc.region : ''}${loc.city ? '·' + loc.city : ''}`;
    const cats = [
      { id: 'festivals', name: '传统节日', icon: '🎊', color: '#e74c3c' },
      { id: 'heroes', name: '历史人物', icon: '🦸', color: '#3498db' },
      { id: 'idioms', name: '成语故事', icon: '📖', color: '#16a085' },
      { id: 'poems', name: '古诗欣赏', icon: '🖌️', color: '#9b59b6' },
      { id: 'inventions', name: '四大发明', icon: '⚙️', color: '#f39c12' },
      { id: 'food', name: '美食文化', icon: '🥟', color: '#e67e22' }
    ];
    const cc = document.getElementById('categories');
    cats.forEach(c => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.style.background = c.color;
      card.innerHTML = `<div class="icon">${c.icon}</div><h3>${c.name}</h3>`;
      card.onclick = () => this.renderCategory(c);
      cc.appendChild(card);
    });
  }
  togglePinyin() { const isHidden = document.body.classList.toggle('hide-pinyin'); const btn = document.getElementById('pinyin-toggle'); if (btn) btn.textContent = isHidden ? '👁️‍🗨️ 显示拼音' : '👁️ 隐藏拼音'; }

  openSetup() {
    const cfg = window.GH.cfg;
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    ov.innerHTML = `<div class="modal" style="max-width:560px;"><h2>⚙️ GitHub 配置</h2><div style="background:#fff3e0;padding:12px;border-radius:8px;margin-bottom:12px;font-size:12px;color:#666;">配置后即可启用跨境聊天 + 访问记录</div><input id="cfg-user" placeholder="GitHub 用户名" value="${cfg.user || ''}"><input id="cfg-token" type="password" placeholder="Token (ghp_...)" value="${cfg.token || ''}"><input id="cfg-chat-repo" placeholder="聊天仓库" value="${cfg.chatRepo || 'hx-chat-data'}"><input id="cfg-visit-repo" placeholder="访问仓库" value="${cfg.visitRepo || 'hx-visitor-data'}"><button class="btn btn-primary" id="cfg-save">💾 保存</button><button class="btn btn-success" id="cfg-test">🧪 测试</button><button class="btn btn-secondary" id="cfg-close">关闭</button><p id="cfg-msg" style="margin-top:10px;font-size:13px;"></p></div>`;
    document.body.appendChild(ov);
    document.getElementById('cfg-close').onclick = () => ov.remove();
    document.getElementById('cfg-save').onclick = () => {
      window.GH.cfg = {
        user: document.getElementById('cfg-user').value.trim(),
        token: document.getElementById('cfg-token').value.trim(),
        chatRepo: document.getElementById('cfg-chat-repo').value.trim() || 'hx-chat-data',
        visitRepo: document.getElementById('cfg-visit-repo').value.trim() || 'hx-visitor-data'
      };
      document.getElementById('cfg-msg').innerHTML = '✅ 已保存';
    };
    document.getElementById('cfg-test').onclick = async () => {
      window.GH.cfg = {
        user: document.getElementById('cfg-user').value.trim(),
        token: document.getElementById('cfg-token').value.trim(),
        chatRepo: document.getElementById('cfg-chat-repo').value.trim() || 'hx-chat-data',
        visitRepo: document.getElementById('cfg-visit-repo').value.trim() || 'hx-visitor-data'
      };
      const msg = document.getElementById('cfg-msg');
      msg.innerHTML = '🧪 测试中...';
      try {
        const r = await this._ghFetch(`https://api.github.com/repos/${window.GH.cfg.user}/${window.GH.cfg.chatRepo}`, { headers: { 'Authorization': `token ${window.GH.cfg.token}` }});
        msg.innerHTML = '✅ 连接成功';
      } catch (e) { msg.innerHTML = '❌ 失败：' + e.message; }
    };
  }

  openChat() {
    if (!window.GH.hasAuth()) { if (confirm('请先配置 GitHub。是否现在配置？')) this.openSetup(); return; }
    const myName = localStorage.getItem('hx_chat_name') || '';
    const myCountry = localStorage.getItem('hx_chat_country') || '🇨🇳';
    const myRoom = localStorage.getItem('hx_chat_room') || '';
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    ov.innerHTML = `<div class="modal" style="max-width:560px;"><h2>💬 跨境聊天</h2><p style="color:#666;font-size:13px;margin-bottom:12px;">基于 GitHub Issues，0 成本、跨境。</p><input id="ch-name" placeholder="您的姓名" value="${myName}"><input id="ch-room" placeholder="房间号" value="${myRoom}"><select id="ch-country"><option value="🇨🇳">🇨🇳 中国</option><option value="🇯🇵">🇯🇵 日本</option><option value="🇰🇷">🇰🇷 韩国</option><option value="🇸🇬">🇸🇬 新加坡</option><option value="🇺🇸">🇺🇸 美国</option><option value="🇬🇧">🇬🇧 英国</option><option value="🇫🇷">🇫🇷 法国</option><option value="🇦🇺">🇦🇺 澳大利亚</option></select><button class="btn btn-primary" id="ch-enter">进入</button><button class="btn btn-secondary" id="ch-close">关闭</button></div>`;
    document.body.appendChild(ov);
    document.getElementById('ch-country').value = myCountry;
    document.getElementById('ch-close').onclick = () => ov.remove();
    document.getElementById('ch-enter').onclick = () => {
      const name = document.getElementById('ch-name').value.trim();
      const room = document.getElementById('ch-room').value.trim();
      const country = document.getElementById('ch-country').value;
      if (!name || !room) return alert('请填写姓名和房间号');
      localStorage.setItem('hx_chat_name', name);
      localStorage.setItem('hx_chat_room', room);
      localStorage.setItem('hx_chat_country', country);
      ov.remove();
      this._openChatRoom(name, country, room);
    };
  }

  _openChatRoom(name, country, room) {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    ov.innerHTML = `<div class="modal" style="max-width:560px;"><h2>💬 ${room}</h2><p style="font-size:12px;color:#888;margin-bottom:8px;">您是 <strong>${country} ${name}</strong> · <a href="#" id="ch-leave" style="color:#c62828;">换房间</a></p><div class="chat-window"><div class="chat-messages" id="chat-msgs">加载中...</div><div class="chat-input-row"><input id="ch-input" placeholder="输入消息，回车发送"><button class="btn btn-primary" id="ch-send">发送</button></div></div><button class="btn btn-secondary" id="ch-close" style="margin-top:10px;">关闭</button></div>`;
    document.body.appendChild(ov);
    document.getElementById('ch-close').onclick = () => ov.remove();
    document.getElementById('ch-leave').onclick = e => { e.preventDefault(); ov.remove(); this.openChat(); };
    const send = async () => {
      const input = document.getElementById('ch-input');
      const text = input.value.trim();
      if (!text) return;
      input.value = ''; input.disabled = true;
      try {
        const c = new GitHubChat(window.GH.cfg.user, window.GH.cfg.token, window.GH.cfg.chatRepo);
        await c.sendMessage(room, name, country, text);
        await this._renderChatMessages(room, name);
      } catch (e) { alert('发送失败：' + e.message); }
      finally { input.disabled = false; input.focus(); }
    };
    document.getElementById('ch-send').onclick = send;
    document.getElementById('ch-input').onkeypress = e => { if (e.key === 'Enter') send(); };
    this._renderChatMessages(room, name);
    this._chatTimer = setInterval(() => this._renderChatMessages(room, name), 3000);
  }

  async _renderChatMessages(room, myName) {
    const cont = document.getElementById('chat-msgs');
    if (!cont) return;
    try {
      const c = new GitHubChat(window.GH.cfg.user, window.GH.cfg.token, window.GH.cfg.chatRepo);
      const msgs = await c.getMessages(room);
      cont.innerHTML = msgs.map(m => {
        const isMe = m.from === myName;
        const time = new Date(m.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        return `<div class="chat-msg ${isMe ? 'me' : ''}"><div>${!isMe ? `<div class="name">${m.country} ${m.from}</div>` : ''}<div class="bubble">${this._esc(m.text)}</div><div class="time">${time}</div></div></div>`;
      }).join('') || '<p style="text-align:center;color:#999;">还没有消息</p>';
      cont.scrollTop = cont.scrollHeight;
    } catch (e) { cont.innerHTML = `<p style="color:#c62828;text-align:center;">加载失败：${e.message}</p>`; }
  }
  _esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  openGlobe() {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    ov.innerHTML = `<div style="background:white;border-radius:20px;padding:20px;max-width:1100px;width:100%;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h2 style="color:#5e35b1;margin:0;">🌍 世界地图</h2><button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button></div><div class="map-container" id="map"></div><div id="country-info" style="margin-top:16px;"></div></div>`;
    document.body.appendChild(ov);
    this._renderMap();
  }
  _renderMap() {
    const map = document.getElementById('map');
    const w = 1000, h = 600;
    map.innerHTML = `<svg class="map-svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#cce5ff"/><g fill="#a8d5a3" stroke="#5a8a55" stroke-width="1"><path d="M 80,150 L 280,140 L 320,250 L 280,330 L 180,340 L 100,280 Z"/><path d="M 250,360 L 320,360 L 340,500 L 280,560 L 240,520 Z"/><path d="M 460,180 L 560,170 L 580,240 L 530,280 L 460,260 Z"/><path d="M 480,290 L 600,290 L 620,440 L 540,500 L 480,420 Z"/><path d="M 560,170 L 880,180 L 900,330 L 820,400 L 700,360 L 600,300 Z"/><path d="M 800,460 L 920,470 L 900,540 L 820,540 Z"/></g></svg>`;
    Object.entries(window.COUNTRIES).forEach(([code, c]) => {
      const m = document.createElement('div');
      m.className = 'country-marker';
      m.textContent = c.flag;
      m.style.left = (c.x / w * 100) + '%';
      m.style.top = (c.y / h * 100) + '%';
      m.title = c.name;
      m.onclick = () => {
        document.getElementById('country-info').innerHTML = `<div style="background:#ede7f6;padding:16px;border-radius:12px;"><h3 style="margin:0;color:#5e35b1;">${c.flag} ${c.name}</h3><p style="color:#666;margin:8px 0;">进入此国家的聊天房间：</p><button class="btn btn-success" onclick="localStorage.setItem('hx_chat_room','world-${code}');localStorage.setItem('hx_chat_country','${c.flag}');app.openChat();" style="max-width:300px;">💬 进入 ${c.name} 房间</button></div>`;
      };
      map.appendChild(m);
    });
  }

  openVideo() {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    ov.innerHTML = `<div class="modal"><h2>📹 视频课堂</h2><input id="vc-room" placeholder="房间号"><input id="vc-name" placeholder="您的姓名" value="老师"><button class="btn btn-primary" id="vc-start">🎥 开始</button><button class="btn btn-success" id="vc-join">🎒 加入</button><button class="btn btn-secondary" id="vc-close">关闭</button></div>`;
    document.body.appendChild(ov);
    document.getElementById('vc-close').onclick = () => ov.remove();
    document.getElementById('vc-start').onclick = () => { const r = document.getElementById('vc-room').value.trim(); if (!r) return alert('请输入房间号'); this.launchJitsi(r, document.getElementById('vc-name').value || '老师', true); ov.remove(); };
    document.getElementById('vc-join').onclick = () => { const r = document.getElementById('vc-room').value.trim(); if (!r) return alert('请输入房间号'); this.launchJitsi(r, '学生', false); ov.remove(); };
  }
  launchJitsi(roomName, name, isMod) {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#000;';
    c.innerHTML = `<div id="jitsi" style="width:100%;height:100%;"></div><button id="vc-exit" style="position:absolute;top:20px;right:20px;background:#c62828;color:white;border:none;padding:10px 20px;border-radius:24px;cursor:pointer;z-index:100000;">✕ 退出</button>`;
    document.body.appendChild(c);
    const init = () => { try { const api = new JitsiMeetExternalAPI('meet.jit.si', { roomName, width: '100%', height: '100%', parentNode: document.getElementById('jitsi'), userInfo: { displayName: name, moderator: isMod }, configOverwrite: { startWithAudioMuted: !isMod, prejoinPageEnabled: false } }); api.addListener('readyToClose', () => c.remove()); document.getElementById('vc-exit').onclick = () => { api.dispose(); c.remove(); }; } catch (e) { alert('视频加载失败：https://meet.jit.si/' + roomName); } };
    if (window.JitsiMeetExternalAPI) init();
    else { const s = document.createElement('script'); s.src = 'https://meet.jit.si/external_api.js'; s.onload = init; document.head.appendChild(s); }
  }

  openStudy() {
    const data = JSON.parse(localStorage.getItem('hx_study') || '{"views":[]}');
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    ov.innerHTML = `<div class="modal"><h2>📊 学习记录</h2><p style="margin:8px 0;color:#666;">📖 已读 <strong>${data.views.length}</strong> 篇</p>${data.views.length === 0 ? '<p style="color:#999;">还没有记录</p>' : data.views.slice(-10).reverse().map(v => `<div style="padding:8px;margin:6px 0;background:#f5f5f5;border-radius:8px;font-size:13px;">📖 <strong>${v.title}</strong><br><span style="color:#888;font-size:11px;">${new Date(v.lastRead).toLocaleString('zh-CN')}</span></div>`).join('')}<button class="btn btn-secondary" id="st-close" style="margin-top:12px;">关闭</button></div>`;
    document.body.appendChild(ov);
    document.getElementById('st-close').onclick = () => ov.remove();
  }

  async renderCategory(cat) {
    this.currentCategory = cat;
    document.getElementById('app').innerHTML = `<div class="list-header" style="background:${cat.color || '#5e35b1'};"><button class="back-btn" id="back-btn">← 返回</button><h2 style="color:white;">${cat.icon} ${cat.name}</h2><span style="width:60px;"></span></div><div class="article-list" id="article-list">加载中...</div>`;
    document.getElementById('back-btn').onclick = () => this.renderHome();
    const articles = await this.loadIndex(cat.id);
    const list = document.getElementById('article-list');
    if (!articles.length) { list.innerHTML = '<p style="text-align:center;color:#888;padding:40px;">该分类下还没有内容</p>'; return; }
    list.innerHTML = '';
    articles.forEach(a => {
      const card = document.createElement('div');
      card.className = 'article-item';
      card.innerHTML = `<div class="icon">${a.icon || '📄'}</div><div><h3>${a.title}</h3></div>`;
      card.onclick = () => this.openArticle(cat.id, a.id);
      list.appendChild(card);
    });
  }
  async loadIndex(cat) { try { const r = await fetch(`content/${cat}/index.json?_=${Date.now()}`); if (r.ok) return await r.json(); } catch (e) {} return { festivals: [{ id: 'duanwu', title: '端午节', icon: '🐉' }] }[cat] || []; }
  async openArticle(cat, id) {
    try {
      const r = await fetch(`content/${cat}/${id}.json?_=${Date.now()}`);
      if (!r.ok) throw 0;
      const data = await r.json();
      this._recordStudy(cat, id, data.title);
      document.getElementById('app').innerHTML = '<div id="reader"></div>';
      new ArticleRenderer(data).render('reader');
    } catch (e) { alert('加载失败'); }
  }
  _recordStudy(cat, id, title) {
    const data = JSON.parse(localStorage.getItem('hx_study') || '{"views":[]}');
    const existing = data.views.find(v => v.category === cat && v.id === id);
    if (existing) { existing.count = (existing.count || 1) + 1; existing.lastRead = new Date().toISOString(); }
    else { data.views.push({ category: cat, id, title, count: 1, firstRead: new Date().toISOString(), lastRead: new Date().toISOString() }); }
    localStorage.setItem('hx_study', JSON.stringify(data));
  }
}

class ArticleRenderer {
  constructor(article) { this.article = article; }
  render(id) {
    const c = document.getElementById(id); c.innerHTML = '';
    const header = document.createElement('div'); header.className = 'reader-header';
    header.innerHTML = `<button class="back-btn" id="r-back">← 返回</button><h1>${this.article.title}</h1><button class="play-all-btn" id="play-all">🔊 朗读</button>`;
    c.appendChild(header);
    const main = document.createElement('div'); main.className = 'article-main';
    const cover = document.createElement('div'); cover.className = 'block block-image';
    cover.style.cssText = 'text-align:center;background:linear-gradient(135deg, #ffeaa7, #fab1a0);border-radius:14px;padding:30px;margin-bottom:20px;';
    cover.innerHTML = `<div style="font-size:100px;">${this.article.coverIcon || '📖'}</div><div style="font-size:20px;color:#c0392b;font-weight:bold;margin-top:10px;">${this.article.title}</div>`;
    main.appendChild(cover);
    (this.article.content || []).forEach(b => this._render(b, main));
    c.appendChild(main);
    const footer = document.createElement('div'); footer.className = 'article-footer'; footer.innerHTML = '🌟 华夏小课堂';
    c.appendChild(footer);
    document.getElementById('r-back').onclick = () => window.app.renderCategory(window.app.currentCategory);
    document.getElementById('play-all').onclick = () => this._playAll();
  }
  _render(block, parent) {
    const div = document.createElement('div'); div.className = `block block-${block.type}`; div.dataset.text = block.text || block.content || '';
    if (block.type === 'paragraph' || block.type === 'story') { new PinyinLine(block.text).render(div); div.onclick = () => window.tts && window.tts.speak(block.text); }
    else if (block.type === 'dialogue') { div.style.cssText = 'background:#e3f2fd;border-left:4px solid #2196f3;border-radius:14px;padding:18px;margin:16px 0;cursor:pointer;'; div.innerHTML = `<strong style="color:#1976d2;font-size:18px;">💬 ${block.speaker}：</strong>`; new PinyinLine(block.text).render(div); div.onclick = () => window.tts && window.tts.speak(block.text); }
    else if (block.type === 'image') { div.classList.add('block-image'); div.innerHTML = `<div style="font-size:100px;">${block.icon || '🎨'}</div><div style="color:#666;font-style:italic;margin-top:8px;">${block.caption || ''}</div>`; }
    else if (block.type === 'knowledge') { div.style.cssText = 'background:#fff3e0;border-left:4px solid #ff9800;border-radius:14px;padding:18px;margin:16px 0;cursor:pointer;'; const h = document.createElement('h3'); h.style.cssText = 'color:#e65100;margin:0 0 12px;'; h.textContent = block.title || '📚 文化小知识'; div.appendChild(h); const ul = document.createElement('ul'); ul.style.cssText = 'margin:0;padding-left:20px;'; (block.items || []).forEach(it => { const li = document.createElement('li'); li.style.cssText = 'margin:8px 0;line-height:1.7;'; li.textContent = it; ul.appendChild(li); }); div.appendChild(ul); div.onclick = () => window.tts && window.tts.speak((block.items || []).join('。')); }
    else if (block.type === 'poem') { div.style.cssText = 'background:#f3e5f5;border-left:4px solid #9c27b0;border-radius:14px;padding:20px;margin:16px 0;cursor:pointer;'; const h = document.createElement('h3'); h.style.cssText = 'color:#6a1b9a;margin:0 0 16px;'; h.textContent = '📜 ' + (block.title || '古诗欣赏'); div.appendChild(h); const pre = document.createElement('div'); pre.className = 'poem-content'; pre.textContent = block.content; div.appendChild(pre); if (block.author) { const a = document.createElement('div'); a.className = 'poem-author'; a.textContent = '—— ' + block.author; div.appendChild(a); } div.onclick = () => window.tts && window.tts.speak(block.content.replace(/\n/g, '。')); }
    else if (block.type === 'vocabulary') {
      div.className = 'block block-vocabulary';
      div.style.cssText = 'background:#e8f5e9;border-left:4px solid #4caf50;border-radius:14px;padding:20px;margin:16px 0;';
      const h = document.createElement('h3'); h.style.cssText = 'color:#2e7d32;margin:0 0 16px;cursor:pointer;'; h.textContent = '✏️ ' + (block.title || '生字乐园');
      div.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'vocab-grid';
      (block.words || []).forEach(w => { let dp = w.pinyin || ''; if (w.pinyin && w.tone) dp = window.toTonedPinyin(w.pinyin, w.tone); new TianZiGe(w.char, dp).render(grid); });
      div.appendChild(grid);
      h.onclick = e => { e.stopPropagation(); window.tts && window.tts.speak((block.words || []).map(w => w.char).join('')); };
    }
    else if (block.type === 'question') { div.style.cssText = 'background:#fffde7;border-left:4px solid #fbc02d;border-radius:14px;padding:18px;margin:16px 0;cursor:pointer;'; const s = document.createElement('strong'); s.style.cssText = 'color:#f57f17;display:block;margin-bottom:8px;'; s.textContent = '🤔 想一想：'; div.appendChild(s); const p = document.createElement('p'); p.style.cssText = 'font-size:18px;margin:0;color:#5d4037;'; p.textContent = block.text; div.appendChild(p); div.onclick = () => window.tts && window.tts.speak(block.text); }
    parent.appendChild(div);
  }
  async _playAll() {
    if (window.tts) window.tts.stop();
    const blocks = document.querySelectorAll('.article-main .block-paragraph, .article-main .block-story, .article-main .block-dialogue, .article-main .block-knowledge, .article-main .block-poem, .article-main .block-question');
    for (const b of blocks) {
      const text = b.dataset.text; if (!text) continue;
      b.style.background = '#fff9c4'; b.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => window.tts && window.tts.speak(text, { onEnd: r, rate: 0.85 }));
      b.style.background = ''; await new Promise(r => setTimeout(r, 500));
    }
  }
}

class GitHubChat {
  constructor(user, token, repo) { this.user = user; this.token = token; this.repo = repo; }
  get base() { return `https://api.github.com/repos/${this.user}/${this.repo}`; }
  headers() { return { 'Authorization': `token ${this.token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }; }
  async getRoomIssue(roomId) {
    const r = await this._fetch(`${this.base}/issues?labels=chat-room&state=open&per_page=100`, { headers: this.headers() });
    const issues = JSON.parse(r);
    let issue = issues.find(i => i.title === `[Chat] ${roomId}`);
    if (!issue) {
      const cr = await this._fetch(`${this.base}/issues`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ title: `[Chat] ${roomId}`, body: `房间：${roomId}`, labels: ['chat-room'] }) });
      issue = JSON.parse(cr);
    }
    return issue;
  }
  async sendMessage(roomId, from, country, text) {
    const issue = await this.getRoomIssue(roomId);
    const body = `**${country} ${from}** · ${new Date().toLocaleString('zh-CN')}\n\n${text}`;
    await this._fetch(`${this.base}/issues/${issue.number}/comments`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ body }) });
  }
  async getMessages(roomId) {
    const issue = await this.getRoomIssue(roomId);
    const r = await this._fetch(`${this.base}/issues/${issue.number}/comments?per_page=100`, { headers: this.headers() });
    const comments = JSON.parse(r);
    return comments.map(c => {
      const m = c.body.match(/^\*\*([\u{1F000}-\u{1FFFF}\u{1F300}-\u{1F9FF}]*?)\s*([^*]+?)\*\*\s*·\s*([\s\S]*?)\n\n([\s\S]*)$/u);
      if (m) return { id: c.id, from: m[2].trim(), country: m[1].trim(), time: c.created_at, text: m[4] };
      return { id: c.id, from: c.user.login, country: '🌏', time: c.created_at, text: c.body };
    });
  }
  _fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const tid = setTimeout(() => { controller.abort(); reject(new Error('请求超时')); }, 15000);
      fetch(url, { ...options, signal: controller.signal })
        .then(r => { clearTimeout(tid); if (!r.ok) { reject(new Error('HTTP ' + r.status)); return; } return r.text(); })
        .then(t => { clearTimeout(tid); resolve(t); })
        .catch(e => { clearTimeout(tid); reject(e); });
    });
  }
}

window.tts = new HuaXiaTTS();
window.app = new HuaXiaApp();
window.app.init();
