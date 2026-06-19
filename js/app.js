/**
 * 华夏小课堂 - 主应用
 */
class HuaXiaApp {
  constructor() {
    this.currentCategory = null;
  }

  async init() {
    // 等待 TTS 就绪
    await new Promise(resolve => {
      if (window.tts.ready) resolve();
      else window.tts.onReady(() => resolve());
    });

    this.renderHome();
    console.log('🎉 华夏小课堂启动完成');
  }

  /** 首页：分类导航 */
  renderHome() {
    const root = document.getElementById('app');
    root.innerHTML = `
      <div class="home-header">
        <h1>🏮 华夏小课堂</h1>
        <p>读中国故事 · 传中华文化</p>
        <button class="welcome-btn" id="welcome-btn">🔊 点我听介绍</button>
      </div>
      <div class="categories" id="categories"></div>
    `;

    document.getElementById('welcome-btn').onclick = () => {
      window.tts.speak('你好小朋友，欢迎来到华夏小课堂！这里有好多有趣的中国故事。点一点，听一听，让我们一起爱上中文！');
    };

    const categories = [
      { id: 'festivals', name: '传统节日', icon: '🎊', color: '#e74c3c', desc: '春节·端午·中秋...' },
      { id: 'heroes', name: '历史人物', icon: '🦸', color: '#3498db', desc: '孔子·屈原·花木兰...' },
      { id: 'idioms', name: '成语故事', icon: '📖', color: '#16a085', desc: '守株待兔·狐假虎威...' },
      { id: 'poems', name: '古诗欣赏', icon: '🖌️', color: '#9b59b6', desc: '唐诗三百首...' },
      { id: 'inventions', name: '四大发明', icon: '⚙️', color: '#f39c12', desc: '造纸·印刷·火药·指南针...' },
      { id: 'food', name: '美食文化', icon: '🥟', color: '#e67e22', desc: '粽子·饺子·汤圆...' }
    ];

    const catContainer = document.getElementById('categories');
    categories.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.style.background = cat.color;
      card.innerHTML = `
        <div class="icon">${cat.icon}</div>
        <h3>${cat.name}</h3>
        <p>${cat.desc}</p>
      `;
      card.onclick = () => this.renderCategory(cat);
      catContainer.appendChild(card);
    });
  }

  /** 渲染分类下的文章列表 */
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

    document.getElementById('back-btn').onclick = () => this.renderHome();

    const articles = await this.loadCategoryIndex(category.id);
    const list = document.getElementById('article-list');

    if (articles.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:#888;padding:40px;">📦 该分类下还没有内容，敬请期待～</p>';
      return;
    }

    list.innerHTML = '';
    articles.forEach(a => {
      const card = document.createElement('div');
      card.className = 'article-item';
      card.innerHTML = `
        <div class="icon">${a.icon || '📄'}</div>
        <div>
          <h3>${a.title}</h3>
          <p>${a.desc || '点击阅读 →'}</p>
        </div>
      `;
      card.onclick = () => this.openArticle(category.id, a.id);
      list.appendChild(card);
    });
  }

  /** 加载分类索引 */
  async loadCategoryIndex(category) {
    try {
      const resp = await fetch(`content/${category}/index.json?_=${Date.now()}`);
      if (!resp.ok) throw new Error('not found');
      return await resp.json();
    } catch (e) {
      // 内置索引（无网络/无文件时使用）
      return this._builtinIndex(category);
    }
  }

  _builtinIndex(category) {
    const builtin = {
      festivals: [
        { id: 'duanwu', title: '端午节', icon: '🐉', desc: '屈原与粽子的故事' }
      ],
      heroes: [],
      idioms: [],
      poems: [],
      inventions: [],
      food: []
    };
    return builtin[category] || [];
  }

  /** 打开一篇文章 */
  async openArticle(category, id) {
    const data = await this.loadArticle(category, id);
    if (!data) {
      alert('加载文章失败：' + id);
      return;
    }
    document.getElementById('app').innerHTML = '<div id="reader"></div>';
    new ArticleRenderer(data).render('reader');
  }

  async loadArticle(category, id) {
    try {
      const resp = await fetch(`content/${category}/${id}.json?_=${Date.now()}`);
      if (!resp.ok) throw new Error('not found');
      return await resp.json();
    } catch (e) {
      console.warn('加载文章失败', e);
      return null;
    }
  }
}

/**
 * 文章渲染器
 */
class ArticleRenderer {
  constructor(article) {
    this.article = article;
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // 顶部
    const header = document.createElement('div');
    header.className = 'reader-header';
    header.innerHTML = `
      <button class="back-btn" id="r-back">← 返回</button>
      <h1>${this.article.title}</h1>
      <button class="play-all-btn" id="play-all">🔊 朗读</button>
    `;
    container.appendChild(header);

    // 主体
    const main = document.createElement('div');
    main.className = 'article-main';

    // 封面
    const cover = document.createElement('div');
    cover.className = 'block block-image';
    cover.style.background = 'linear-gradient(135deg, #ffeaa7, #fab1a0)';
    cover.innerHTML = `
      <div class="emoji-big">${this.article.coverIcon || '📖'}</div>
      <div class="caption" style="font-size:18px;color:#c0392b;font-weight:bold;">${this.article.title}</div>
      <div class="caption" style="margin-top:6px;">— ${this.article.subtitle || ''} —</div>
    `;
    main.appendChild(cover);

    // 各内容块
    (this.article.content || []).forEach(block => this._renderBlock(block, main));
    container.appendChild(main);

    // 底部
    const footer = document.createElement('div');
    footer.className = 'article-footer';
    footer.innerHTML = `版本 v${this.article.version || '1.0'} · 更新于 ${this.article.lastUpdated || ''}<br>🌟 华夏小课堂 · 让世界听见中国`;
    container.appendChild(footer);

    // 绑定事件
    document.getElementById('r-back').onclick = () => window.app.renderCategory(window.app.currentCategory);
    document.getElementById('play-all').onclick = () => this._playAll();
  }

  _renderBlock(block, parent) {
    const div = document.createElement('div');
    div.className = `block block-${block.type}`;
    div.dataset.type = block.type;

    switch (block.type) {
      case 'paragraph':
      case 'story': {
        const line = new PinyinLine(block.text);
        line.render(div);
        div.dataset.text = block.text;
        div.onclick = () => window.tts.speak(block.text);
        break;
      }

      case 'dialogue': {
        div.style.background = '#e3f2fd';
        div.style.borderLeft = '4px solid #2196f3';
        div.innerHTML = `<strong style="color:#1976d2;">💬 ${block.speaker}：</strong>`;
        const line = new PinyinLine(block.text);
        line.render(div);
        div.dataset.text = block.text;
        div.onclick = () => window.tts.speak(block.text);
        break;
      }

      case 'image': {
        div.classList.add('block-image');
        div.style.cursor = 'default';
        div.innerHTML = `
          <div class="emoji-big">${block.icon || '🎨'}</div>
          <div class="caption">${block.caption || ''}</div>
        `;
        break;
      }

      case 'knowledge': {
        div.innerHTML = `<h3>${block.title || '📚 文化小知识'}</h3><ul></ul>`;
        const ul = div.querySelector('ul');
        (block.items || []).forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = item;
          ul.appendChild(li);
        });
        div.onclick = () => window.tts.speak((block.items || []).join('。'));
        break;
      }

      case 'poem': {
        div.innerHTML = `<h3>📜 ${block.title || '古诗欣赏'}</h3>`;
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
        div.onclick = () => window.tts.speak(block.content.replace(/\n/g, '。'));
        break;
      }

      case 'vocabulary': {
        div.className = 'block block-vocabulary';
        div.innerHTML = `<h3>✏️ ${block.title || '生字乐园'}（点字听音）</h3>`;
        const grid = document.createElement('div');
        grid.className = 'vocab-grid';
        (block.words || []).forEach(w => {
          const tzg = new TianZiGe(w.char, w.pinyin, w.tone);
          tzg.render(grid);
        });
        div.appendChild(grid);
        // 点击标题朗读所有生字
        div.querySelector('h3').onclick = e => {
          e.stopPropagation();
          window.tts.speak((block.words || []).map(w => w.char).join(''));
        };
        break;
      }

      case 'question': {
        div.innerHTML = `<strong>🤔 想一想：</strong><p>${block.text}</p>`;
        div.onclick = () => window.tts.speak(block.text);
        break;
      }
    }

    parent.appendChild(div);
  }

  async _playAll() {
    window.tts.stop();
    const blocks = document.querySelectorAll('.article-main .block-paragraph, .article-main .block-story, .article-main .block-dialogue, .article-main .block-knowledge, .article-main .block-poem, .article-main .block-question');
    for (const b of blocks) {
      const text = b.dataset.text;
      if (!text) continue;
      b.style.background = '#fff9c4';
      b.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => {
        window.tts.speak(text, { onEnd: resolve, rate: 0.85 });
      });
      b.style.background = '';
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

window.ArticleRenderer = ArticleRenderer;
window.HuaXiaApp = HuaXiaApp;

// 启动
window.app = new HuaXiaApp();
window.addEventListener('DOMContentLoaded', () => window.app.init());
