/**
 * 跨浏览器中文女声TTS引擎
 * 自动选择最佳女声，覆盖 Chrome/Edge/Safari/Firefox/移动端
 */
class HuaXiaTTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.ready = false;
    this.onReadyCallbacks = [];
    this.statusEl = document.getElementById('tts-status');
    this._init();
  }

  _init() {
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      if (voices.length === 0) return false;

      this.voice = this._pickFemaleChineseVoice(voices);
      this.ready = !!this.voice;
      
      if (this.ready) {
        console.log('✅ TTS 已就绪，语音:', this.voice.name, this.voice.lang);
        this.onReadyCallbacks.forEach(cb => cb(this.voice));
        this.onReadyCallbacks = [];
      }
      return this.ready;
    };

    if (!loadVoices()) {
      this.synth.addEventListener('voiceschanged', loadVoices);
      let tries = 0;
      const timer = setInterval(() => {
        if (loadVoices() || ++tries > 30) clearInterval(timer);
      }, 200);
    }
  }

  /**
   * 智能挑选中文女声
   * 策略：女声关键词 > 知名女声 > zh-CN > 任意中文
   */
  _pickFemaleChineseVoice(voices) {
    const isChinese = v =>
      /zh|chinese|mandarin|cantonese|cmn/i.test(v.lang) ||
      /chinese|中文|普通话|国语/i.test(v.name);
    const isFemale = v =>
      /female|woman|girl|女|woman/i.test(v.name) ||
      /Xiaoxiao|Xiaoyi|Yating|Tingting|Ting-Hsin|Mei|Yunxi|晓晓|晓伊|雅婷|婷婷|美|小美|小艺/i.test(v.name);

    const chineseVoices = voices.filter(isChinese);
    let voice = chineseVoices.find(isFemale);
    if (!voice) {
      const famous = /Microsoft Xiaoxiao|Google 普通话|Mei|Tingting|Yating/i;
      voice = chineseVoices.find(v => famous.test(v.name));
    }
    if (!voice) voice = chineseVoices.find(v => v.lang === 'zh-CN' || v.lang === 'zh_CN');
    if (!voice) voice = chineseVoices[0];
    return voice;
  }

  onReady(cb) {
    if (this.ready) cb(this.voice);
    else this.onReadyCallbacks.push(cb);
  }

  speak(text, options = {}) {
    if (!text) return;
    if (!this.ready) {
      this.onReady(() => this._speakNow(text, options));
      return;
    }
    return this._speakNow(text, options);
  }

  _speakNow(text, options = {}) {
    this.synth.cancel();
    const utter = new SpeechSynthesisUtterance(this._preprocess(text));
    utter.voice = this.voice;
    utter.lang = this.voice.lang || 'zh-CN';
    utter.rate = options.rate ?? 0.85;   // 慢一点，适合小学生
    utter.pitch = options.pitch ?? 1.05;
    utter.volume = options.volume ?? 1.0;

    const showStatus = () => {
      if (this.statusEl) {
        this.statusEl.style.display = 'block';
        this.statusEl.textContent = '🔊 朗读中…';
      }
    };
    const hideStatus = () => {
      if (this.statusEl) this.statusEl.style.display = 'none';
    };

    utter.onstart = () => { showStatus(); if (options.onStart) options.onStart(); };
    utter.onend = () => { hideStatus(); if (options.onEnd) options.onEnd(); };
    utter.onerror = e => {
      hideStatus();
      console.warn('TTS 错误:', e);
      if (options.onEnd) options.onEnd();
    };

    this.synth.speak(utter);
  }

  _preprocess(text) {
    return text
      .replace(/。/g, '。 ')
      .replace(/！/g, '！  ')
      .replace(/？/g, '？  ')
      .replace(/，/g, '， ');
  }

  stop() { this.synth.cancel(); if (this.statusEl) this.statusEl.style.display = 'none'; }
}

window.tts = new HuaXiaTTS();
