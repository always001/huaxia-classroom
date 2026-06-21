if (typeof VideoClassroom === 'undefined') {

class VideoClassroom {
  constructor() {
    this.roomName = 'huaxia-' + (localStorage.getItem('huaxia_teacher_name') || 'laoshi');
  }

  open() { this.showPanel(); }

  showPanel() {
    const old = document.getElementById('video-classroom-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'video-classroom-panel';
    panel.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';

    panel.innerHTML = `
      <div style="background:white;border-radius:20px;padding:32px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="margin:0;color:#5e35b1;">📹 视频课堂</h2>
          <button id="vc-close" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
        </div>
        <div style="background:#ede7f6;padding:16px;border-radius:12px;margin-bottom:16px;">
          <h3 style="margin:0 0 8px;color:#5e35b1;">👩‍🏫 老师操作</h3>
          <p style="margin:0 0 12px;font-size:13px;color:#666;">输入房间号 → 开始上课 → 把房间号发给学生</p>
          <div style="margin-bottom:12px;">
            <label style="font-size:12px;color:#666;">房间号：</label>
            <input id="vc-room" type="text" value="${this.roomName}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
          </div>
          <div style="margin-bottom:12px;">
            <label style="font-size:12px;color:#666;">老师姓名：</label>
            <input id="vc-teacher" type="text" value="${localStorage.getItem('huaxia_teacher_name') || '老师'}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
          </div>
          <button id="vc-start" style="width:100%;padding:12px;background:linear-gradient(135deg, #7e57c2, #4527a0);color:white;border:none;border-radius:10px;cursor:pointer;font-size:15px;font-weight:bold;">🎥 开始上课</button>
        </div>
        <div style="background:#e8f5e9;padding:16px;border-radius:12px;margin-bottom:16px;">
          <h3 style="margin:0 0 8px;color:#2e7d32;">🎒 学生操作</h3>
          <button id="vc-join" style="width:100%;padding:12px;background:linear-gradient(135deg, #66bb6a, #2e7d32);color:white;border:none;border-radius:10px;cursor:pointer;font-size:15px;font-weight:bold;">🎒 输入房间号进入</button>
        </div>
        <div style="background:#fff3e0;padding:16px;border-radius:12px;font-size:12px;color:#e65100;">
          <strong>💡 提示：</strong>基于 Jitsi Meet，完全免费，支持屏幕共享和白板。
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    document.getElementById('vc-close').onclick = () => panel.remove();
    panel.onclick = e => { if (e.target === panel) panel.remove(); };

    document.getElementById('vc-start').onclick = () => {
      const room = document.getElementById('vc-room').value.trim() || this.roomName;
      const teacher = document.getElementById('vc-teacher').value.trim() || '老师';
      this.roomName = room;
      localStorage.setItem('huaxia_teacher_name', teacher);
      this.launchRoom(room, teacher, true);
      panel.remove();
    };

    document.getElementById('vc-join').onclick = () => {
      const room = prompt('请输入老师给您的房间号：');
      if (!room) return;
      this.launchRoom(room.trim(), '学生', false);
      panel.remove();
    };
  }

  launchRoom(roomName, displayName, isModerator) {
    const container = document.createElement('div');
    container.id = 'video-container';
    container.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#000;';
    container.innerHTML = `<div id="jitsi-container" style="width:100%;height:100%;"></div>
      <button id="vc-exit" style="position:absolute;top:20px;right:20px;background:#c62828;color:white;border:none;padding:10px 20px;border-radius:24px;cursor:pointer;font-weight:bold;z-index:100000;">✕ 退出课堂</button>`;
    document.body.appendChild(container);

    if (window.JitsiMeetExternalAPI) {
      this._initJitsi(roomName, displayName, isModerator);
    } else {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.onload = () => this._initJitsi(roomName, displayName, isModerator);
      script.onerror = () => {
        alert('视频服务加载失败。\n您也可以直接访问：https://meet.jit.si/' + roomName);
      };
      document.head.appendChild(script);
    }

    document.getElementById('vc-exit').onclick = () => this.exit();
  }

  _initJitsi(roomName, displayName, isModerator) {
    try {
      this.api = new JitsiMeetExternalAPI('meet.jit.si', {
        roomName, width: '100%', height: '100%',
        parentNode: document.getElementById('jitsi-container'),
        userInfo: { displayName, moderator: isModerator },
        configOverwrite: {
          startWithAudioMuted: !isModerator,
          startWithVideoMuted: false,
          prejoinPageEnabled: false
        }
      });
      this.api.addListener('readyToClose', () => this.exit());
    } catch (e) {
      console.error('Jitsi 初始化失败', e);
      alert('视频初始化失败，请直接访问：\nhttps://meet.jit.si/' + roomName);
    }
  }

  exit() {
    if (this.api) { this.api.dispose(); this.api = null; }
    const c = document.getElementById('video-container');
    if (c) c.remove();
  }
}

window.videoClassroom = new VideoClassroom();
console.log('✅ video-classroom.js 加载完成');

}  // end if
