/**
 * 学习进度追踪模块
 * 用 localStorage 记录小学生读了哪些文章
 */
class StudyTracker {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem('huaxia_study') || '{"views":[],"favorites":[]}');
    } catch (e) {
      return { views: [], favorites: [] };
    }
  }

  _save() {
    localStorage.setItem('huaxia_study', JSON.stringify(this.data));
  }

  /** 记录访问 */
  recordView(category, id, title) {
    const existing = this.data.views.find(v => v.category === category && v.id === id);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.lastRead = new Date().toISOString();
    } else {
      this.data.views.push({
        category, id, title,
        count: 1,
        firstRead: new Date().toISOString(),
        lastRead: new Date().toISOString()
      });
    }
    this._save();
  }

  /** 收藏 */
  toggleFavorite(category, id, title) {
    const idx = this.data.favorites.findIndex(f => f.category === category && f.id === id);
    if (idx >= 0) {
      this.data.favorites.splice(idx, 1);
      this._save();
      return false;
    } else {
      this.data.favorites.push({ category, id, title });
      this._save();
      return true;
    }
  }

  isFavorite(category, id) {
    return this.data.favorites.some(f => f.category === category && f.id === id);
  }

  showProgress() {
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

    const totalViews = this.data.views.length;
    const totalFavorites = this.data.favorites.length;
    const recentViews = this.data.views
      .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
      .slice(0, 10);

    panel.innerHTML = `
      <div style="background:white;border-radius:20px;padding:32px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="margin:0;color:#5e35b1;">📊 我的学习记录</h2>
          <button id="sp-close" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
        </div>

        <div style="display:flex;gap:12px;margin-bottom:24px;">
          <div style="flex:1;background:#ede7f6;padding:16px;border-radius:12px;text-align:center;">
            <div style="font-size:36px;font-weight:bold;color:#5e35b1;">${totalViews}</div>
            <div style="font-size:12px;color:#666;">已读文章</div>
          </div>
          <div style="flex:1;background:#fff3e0;padding:16px;border-radius:12px;text-align:center;">
            <div style="font-size:36px;font-weight:bold;color:#e65100;">${totalFavorites}</div>
            <div style="font-size:12px;color:#666;">收藏</div>
          </div>
        </div>

        <h3 style="color:#5e35b1;margin:0 0 12px;">📖 最近阅读</h3>
        ${recentViews.length === 0 ? '<p style="color:#888;text-align:center;padding:20px;">还没有阅读记录，去读文章吧～</p>' : ''}
        ${recentViews.map(v => `
          <div style="padding:10px;margin-bottom:8px;background:#f5f5f5;border-radius:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;"
               onclick="app.openArticle('${v.category}','${v.id}');document.getElementById('sp-close').click();document.querySelector('#video-classroom-panel,#sp-panel')?.remove();">
            <div>
              <strong>${v.title}</strong><br>
              <small style="color:#888;">${v.category} · 阅读 ${v.count} 次 · ${new Date(v.lastRead).toLocaleDateString()}</small>
            </div>
            <span style="color:#e65100;">${this.isFavorite(v.category, v.id) ? '⭐' : ''}</span>
          </div>
        `).join('')}

        ${totalFavorites > 0 ? `
          <h3 style="color:#e65100;margin:24px 0 12px;">⭐ 我的收藏</h3>
          ${this.data.favorites.map(f => `
            <div style="padding:10px;margin-bottom:8px;background:#fff8e1;border-radius:8px;cursor:pointer;"
                 onclick="app.openArticle('${f.category}','${f.id}');document.getElementById('sp-close').click();">
              <strong>${f.title}</strong> <small style="color:#888;">(${f.category})</small>
            </div>
          `).join('')}
        ` : ''}

        <button onclick="studyTracker.clearAll();document.getElementById('sp-close').click();studyTracker.showProgress();"
          style="margin-top:20px;padding:8px 16px;background:#ffcdd2;color:#c62828;border:none;border-radius:8px;cursor:pointer;width:100%;">
          🗑️ 清空记录
        </button>
      </div>
    `;
    panel.id = 'sp-panel';
    document.body.appendChild(panel);

    document.getElementById('sp-close').onclick = () => panel.remove();
    panel.onclick = e => { if (e.target === panel) panel.remove(); };
  }

  clearAll() {
    if (confirm('清空所有学习记录？')) {
      this.data = { views: [], favorites: [] };
      this._save();
    }
  }
}

window.studyTracker = new StudyTracker();
