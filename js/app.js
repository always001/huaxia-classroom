/**
 * 华夏小课堂 - 主应用（修复版）
 * ✅ 修复：防止重复 init 导致卡死
 * ✅ 修复：TTS 等不到时不阻塞
 * ✅ 修复：拼音库失败时仍能显示
 */
if (typeof HuaXiaApp === 'undefined') {

class HuaXiaApp {
  constructor() {
    this.currentCategory = null;
    this.showPinyin = true;
    this.initialized = false;  // 防止重复 init
  }

  async init() {
    if (this.initialized) {
      console.warn('⚠️ 已经初始化过了，跳过');
      return;
    }
    this.initialized = true;

    console.log('🚀 开始初始化...');

    // ✅ 关键修复：TTS 等不到也不阻塞
    if (window.tts) {
      if (window.tts.ready) {
        console.log('✅ TTS 已就绪');
      } else {
        // 用 race 防止卡死：最多等 3 秒
        await Promise.race([
          new Promise(resolve => {
            if (window.tts.ready) return resolve();
            window.tts.onReady(() => resolve());
          }),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
        console.log(window.tts.ready ? '✅ TTS 就绪' : '⚠️ TTS 超时，继续');
      }
    }

    // 等拼音库（最多 5 秒）
    await this._waitPinyin(5000);
    if (!window.pinyinPro) {
      console.warn('⚠️ 拼音库未加载，文章段落将不显示拼音');
    } else {
      console.log('✅ 拼音库就绪');
    }

    this.renderHome();
    console.log('🎉 华夏小课堂启动完成！');
  }

  _waitPinyin(maxMs) {
    return new Promise(resolve => {
      if (window.pinyinPro) return resolve();
      const start = Date.now();
      const check = () => {
        if (window.pinyinPro) return resolve();
        if (Date.now() - start > maxMs) return resolve();
        setTimeout(check, 100);
      };
      check();
    });
  }

  bindGlobalEvents() {
    document.addEventListener('keydown', e => {
      if ((e.key === 'p' || e.key === 'P') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.togglePinyin();
      }
    });
  }

  togglePinyin() {
    this.showPinyin = !this.showPinyin;
    document.body.classList.toggle('hide-pinyin', !this.showPinyin);
    const btn = document.getElementById('pinyin-toggle');
    if (btn) btn.textContent = this.showPinyin ? '👁️ 隐藏拼音' : '👁️‍🗨️ 显示拼音';
  }

  renderHome() {
    const root = document.getElementById('app');
    if (!root) {
      console.error('❌ 找不到 #app 元素');
      return;
    }

    root.innerHTML = `
      <div class="home-header">
        <h1>🏮 华夏小课堂</h1>
        <p>读中国故事 · 传中华文化</p>
        <button class="welcome-btn" id="welcome-btn">🔊 点我听介绍</button>
      </div>
      <div class="quick-actions">
        <button class="qa-btn" onclick="app.openVideoClassroom()">📹 视频课堂</button>
        <button class="qa-btn" onclick="app.openStudyProgress()">📊 学习记录</button>
        <button class="qa-btn" onclick="app.togglePinyin()" id="pinyin-toggle">👁️ 隐藏拼音</button>
      </div>
      <div class="categories" id="categories"></div>
      <footer style="text-align:center;padding:30px;color:#888;font-size:13px;">
        <p>🌟 华夏小课堂 · 让世界听见中国</p>
        <p style="font-size:12px;">教师入口：<a href="admin/" style="color:#5e35b1;">后台管理</a></p>
      </footer>
    `;

    const btn = document.getElementById('welcome-btn');
    if (btn) {
      btn.onclick = () => {
        if (window.tts && window.tts.ready) {
          window.tts.speak('你好小朋友，欢迎来到华夏小课堂！');
        } else {
          alert('语音还没准备好，请稍等再试');
        }
      };
    }

    const categories = [
      { id: 'festivals',   name: '传统节日', icon: '🎊', color: '#e74c3c', desc: '春节·端午·中秋...' },
      { id: 'heroes',      name: '历史人物', icon: '🦸', color: '#3498db', desc: '孔子·屈原·花木兰...' },
      { id: 'idioms',      name: '成语故事', icon: '📖', color: '#16a085', desc: '守株待兔·狐假虎威...' },
      { id: 'poems',       name: '古诗欣赏', icon: '🖌️', color: '#9b59b6', desc: '唐诗三百首...' },
      { id: 'inventions',  name: '四大发明', icon: '⚙️', color: '#f39c12', desc: '造纸·印刷·火药·指南针...' },
      { id: 'food',        name: '美食文化', icon: '🥟', color: '#e67e22', desc: '粽子·饺子·汤圆...' }
    ];

    const catContainer = document.getElementById('categories');
    if (!catContainer) return;
    catContainer.innerHTML = '';

    categories.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.style.background = cat.color;
      card.innerHTML = `<div class="icon">${cat.icon}</div><h3>${cat.name}</h3><p>${cat.desc}</p>`;
      card.onclick = () => this.renderCategory(cat);
      catContainer.appendChild(card);
    });
  }

  openVideoClassroom() {
    if (window.videoClassroom) window.videoClassroom.open();
    else alert('视频模块未加载');
  }

  openStudyProgress() {
    if (window.studyTracker) window.studyTracker.showProgress();
    else alert('进度模块未加载');
  }

  async renderCategory(category) {
    this.currentCategory = category;
    const root = document.getElementById('app');
    root.innerHTML = `
      <div class="list-header" style="background:${category.color};">
        <button class="back-btn" id="back-btn">← 返回</button>
        <h2 style="color:white;">${category.icon} ${category.name}</h2>
        <span style="width:60px;"></span>
      </div>
      <div class="article-list" id="article-list">加载中...</div>
    `;
    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.onclick = () => this.renderHome();

    const articles = await this.loadCategoryIndex(category.id);
    const list = document.getElementById('article-list');
    if (!list) return;

    if (!articles || articles.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:#888;padding:40px;">📦 该分类下还没有内容</p>';
      return;
    }
    list.innerHTML = '';
    articles.forEach(a => {
      const card = document.createElement('div');
      card.className = 'article-item';
      card.innerHTML = `<div class="icon">${a.icon || '📄'}</div>
        <div><h3>${a.title}</h3><p>${a.desc || '点击阅读 →'}</p></div>`;
      card.onclick = () => this.openArticle(category.id, a.id);
      list.appendChild(card);
    });
  }

  async loadCategoryIndex(category) {
    try {
      const resp = await fetch(`content/${category}/index.json?_=${Date.now()}`);
      if (!resp.ok) throw new Error('not found');
      return await resp.json();
    } catch (e) {
      return { festivals: [{ id: 'duanwu', title: '端午节', icon: '🐉', desc: '屈原与粽子' }] }[category] || [];
    }
  }

  async openArticle(category, id) {
    const data = await this.loadArticle(category, id);
    if (!data) { alert('加载文章失败：' + id); return; }
    if (window.studyTracker) window.studyTracker.recordView(category, id, data.title);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '<div id="reader"></div>';
      new ArticleRenderer(data).render('reader');
    }
  }

  async loadArticle(category, id) {
    try {
      const resp = await fetch(`content/${category}/${id}.json?_=${Date.now()}`);
      if (!resp.ok) throw new Error('not found');
      return await resp.json();
    } catch (e) {
      console.error('加载文章失败', e);
      return null;
    }
  }
}

/**
 * 文章渲染器
 */
if (typeof ArticleRenderer === 'undefined') {

class ArticleRenderer {
  constructor(article) {
    this.article = article;
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'reader-header';
    header.innerHTML = `
      <button class="back-btn" id="r-back">← 返回</button>
      <h1>${this.article.title}</h1>
      <button class="play-all-btn" id="play-all">🔊 朗读</button>
    `;
    container.appendChild(header);

    const main = document.createElement('div');
    main.className = 'article-main';

    const cover = document.createElement('div');
    cover.className = 'block block-image';
    cover.style.cssText = 'text-align:center;background:linear-gradient(135deg, #ffeaa7, #fab1a0);border-radius:14px;padding:30px;margin-bottom:20px;';
    cover.innerHTML = `
      <div style="font-size:100px;">${this.article.coverIcon || '📖'}</div>
      <div style="font-size:20px;color:#c0392b;font-weight:bold;margin-top:10px;">${this.article.title}</div>
      <div style="color:#666;margin-top:6px;">— ${this.article.subtitle || ''} —</div>
    `;
    main.appendChild(cover);

    (this.article.content || []).forEach(block => this._renderBlock(block, main));
    container.appendChild(main);

    const footer = document.createElement('div');
    footer.className = 'article-footer';
    footer.innerHTML = `版本 v${this.article.version || '1.0.0'} · 更新于 ${this.article.lastUpdated || ''}<br>🌟 华夏小课堂`;
    container.appendChild(footer);

    const rBack = document.getElementById('r-back');
    if (rBack) rBack.onclick = () => window.app.renderCategory(window.app.currentCategory);
    const playAll = document.getElementById('play-all');
    if (playAll) playAll.onclick = () => this._playAll();
  }

  _renderBlock(block, parent) {
    const div = document.createElement('div');
    div.className = `block block-${block.type}`;
    div.dataset.type = block.type;
    div.dataset.text = block.text || block.content || '';

    switch (block.type) {
      case 'paragraph':
      case 'story': {
        const line = new PinyinLine(block.text, {}, { size: 'large' });
        line.render(div);
        div.onclick = () => window.tts && window.tts.ready && window.tts.speak(block.text);
        break;
      }

      case 'dialogue': {
        div.style.cssText = 'background:#e3f2fd;border-left:4px solid #2196f3;border-radius:14px;padding:18px;margin:16px 0;cursor:pointer;';
        div.innerHTML = `<strong style="color:#1976d2;font-size:18px;">💬 ${block.speaker}：</strong>`;
        const line = new PinyinLine(block.text, {}, { size: 'large' });
        line.render(div);
        div.onclick = () => window.tts && window.tts.ready && window.tts.speak(block.text);
        break;
      }

      case 'image': {
        div.classList.add('block-image');
        div.onclick = null;
        div.innerHTML = `
          <div style="font-size:100px;">${block.icon || '🎨'}</div>
          <div style="color:#666;font-style:italic;margin-top:8px;">${block.caption || ''}</div>
        `;
        break;
      }

      case 'knowledge': {
        div.style.cssText = 'background:#fff3e0;border-left:4px solid #ff9800;border-radius:14px;padding:18px;margin:16px 0;cursor:pointer;';
        const h3 = document.createElement('h3');
        h3.style.cssText = 'color:#e65100;margin:0 0 12px;';
        h3.textContent = block.title || '📚 文化小知识';
        div.appendChild(h3);
        const ul = document.createElement('ul');
        ul.style.cssText = 'margin:0;padding-left:20px;';
        (block.items || []).forEach(item => {
          const li = document.createElement('li');
          li.style.cssText = 'margin:8px 0;line-height:1.7;font-size:16px;';
          li.innerHTML = item;
          ul.appendChild(li);
        });
        div.appendChild(ul);
        div.onclick = () => window.tts && window.tts.ready && window.tts.speak((block.items || []).join('。'));
        break;
      }

      case 'poem': {
        div.style.cssText = 'background:#f3e5f5;border-left:4px solid #9c27b0;border-radius:14px;padding:20px;margin:16px 0;cursor:pointer;';
        const h3 = document.createElement('h3');
        h3.style.cssText = 'color:#6a1b9a;margin:0 0 16px;';
        h3.textContent = '📜 ' + (block.title || '古诗欣赏');
        div.appendChild(h3);
        const pre = document.createElement('div');
        pre.className = 'poem-content';
        pre.textContent = block.content;
        div.appendChild(pre);
        if (block.author) {
          const auth = document.createElement('div');
          auth.className = 'poem-author';
          auth.textContent = '—— ' + block.author;
          div.appendChild(auth);
        }
        div.onclick = () => window.tts && window.tts.ready && window.tts.speak(block.content.replace(/\n/g, '。'));
        break;
      }

      case 'vocabulary': {
        div.className = 'block block-vocabulary';
        div.style.cssText = 'background:#e8f5e9;border-left:4px solid #4caf50;border-radius:14px;padding:20px;margin:16px 0;';
        const h3 = document.createElement('h3');
        h3.style.cssText = 'color:#2e7d32;margin:0 0 16px;cursor:pointer;';
        h3.textContent = '✏️ ' + (block.title || '生字乐园');
        div.appendChild(h3);
        const grid = document.createElement('div');
        grid.className = 'vocab-grid';
        (block.words || []).forEach(w => {
          new TianZiGe(w.char, w.pinyin, w.tone, { size: 'normal' }).render(grid);
        });
        div.appendChild(grid);
        h3.onclick = e => {
          e.stopPropagation();
          if (window.tts && window.tts.ready) {
            window.tts.speak((block.words || []).map(w => w.char).join(''));
          }
        };
        break;
      }

      case 'question': {
        div.style.cssText = 'background:#fffde7;border-left:4px solid #fbc02d;border-radius:14px;padding:18px;margin:16px 0;cursor:pointer;';
        const strong = document.createElement('strong');
        strong.style.cssText = 'color:#f57f17;display:block;margin-bottom:8px;';
        strong.textContent = '🤔 想一想：';
        div.appendChild(strong);
        const p = document.createElement('p');
        p.style.cssText = 'font-size:18px;margin:0;color:#5d4037;';
        p.textContent = block.text;
        div.appendChild(p);
        div.onclick = () => window.tts && window.tts.ready && window.tts.speak(block.text);
        break;
      }
    }

    parent.appendChild(div);
  }

  async _playAll() {
    if (window.tts) window.tts.stop();
    const blocks = document.querySelectorAll('.article-main .block-paragraph, .article-main .block-story, .article-main .block-dialogue, .article-main .block-knowledge, .article-main .block-poem, .article-main .block-question');
    for (const b of blocks) {
      const text = b.dataset.text;
      if (!text) continue;
      b.style.background = '#fff9c4';
      b.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => {
        if (window.tts && window.tts.ready) {
          window.tts.speak(text, { onEnd: resolve, rate: 0.85 });
        } else { resolve(); }
      });
      b.style.background = '';
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

window.ArticleRenderer = ArticleRenderer;
}  // end if ArticleRenderer

window.HuaXiaApp = HuaXiaApp;

// ✅ 关键修复：只 init 一次，防止双启动卡死
if (!window.app) {
  window.app = new HuaXiaApp();
  console.log('✅ app.js 加载完成');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.app.init());
  } else {
    // 脚本在 DOM 后面加载就直接启动
    setTimeout(() => window.app.init(), 100);
  }
}

}  // end if HuaXiaApp
