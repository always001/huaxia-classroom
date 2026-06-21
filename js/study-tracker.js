if (typeof StudyTracker === 'undefined') {

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
    try {
      localStorage.setItem('huaxia_study', JSON.stringify(this.data));
    } catch (e) {}
  }

  recordView(category, id, title) {
    const existing = this.data.views.find(v => v.category === category && v.id === id);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.lastRead = new Date().toISOString();
    } else {
      this.data.views.push({ category, id, title, count: 1, firstRead: new Date().toISOString(), lastRead: new Date().toISOString() });
    }
    this._save();
  }

  showProgress() {
    const old = document.getElementById('sp-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'sp-panel';
    panel.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

    const totalViews = this.data.views.length;
    const totalFavorites = this.data.favorites.length;
    const recent = this.data.views.sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead)).slice(0, 10);

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
        ${recent.length === 0 ? '<p style="color:#888;text-align:center;padding:20px;">还没有阅读记录</p>' : ''}
        ${recent.map(v => `
          <div style="padding:10px;margin-bottom:8px;background:#f5f5f5;border-radius:8px;cursor:pointer;"
               onclick="document.getElementById('sp-close').click();app.openArticle('${v.category}','${v.id}');">
            <strong>${v.title}</strong><br>
            <small style="color:#888;">${v.category} · 阅读 ${v.count} 次 · ${new Date(v.lastRead).toLocaleDateString()}</small>
          </div>
        `).join('')}
      </div>
    `;
    document.body.appendChild(panel);
    document.getElementById('sp-close').onclick = () => panel.remove();
    panel.onclick = e => { if (e.target === panel) panel.remove(); };
  }
}

window.studyTracker = new StudyTracker();
console.log('✅ study-tracker.js 加载完成');

}  // end if
