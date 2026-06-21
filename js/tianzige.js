/**
 * 田字格 + 拼音 + 声调（终极版）
 * ✅ 修复：拼音库未加载时不报错
 * ✅ 修复：声调符号位置正确
 * ✅ 修复：防止重复定义
 */

if (typeof TianZiGe === 'undefined') {

class TianZiGe {
  constructor(char, pinyin = '', tone = 0, options = {}) {
    this.char = char;
    this.pinyin = pinyin;
    this.tone = tone;
    this.size = options.size || 'normal';
  }

  render(container) {
    const word = document.createElement('div');
    word.className = `tianzige-word ${this.size === 'large' ? 'large' : 'normal'}`;
    word.title = '点我读：' + this.char;

    // 拼音行
    const pinyinRow = document.createElement('div');
    pinyinRow.className = 'pinyin-row';
    if (this.pinyin) {
      const toneSpan = document.createElement('span');
      toneSpan.className = 'tone';
      const toneMarks = { 1: '¯', 2: '´', 3: 'ˇ', 4: '`', 5: '' };
      toneSpan.textContent = this.pinyin;
      toneSpan.setAttribute('data-tone-mark', toneMarks[this.tone] || '');
      pinyinRow.appendChild(toneSpan);
    } else {
      // 没拼音也要占位
      pinyinRow.innerHTML = '&nbsp;';
    }
    word.appendChild(pinyinRow);

    // 田字格
    const cell = document.createElement('div');
    cell.className = 'tianzige-cell';
    cell.textContent = this.char;
    word.appendChild(cell);

    word.addEventListener('click', e => {
      e.stopPropagation();
      cell.classList.add('highlight');
      setTimeout(() => cell.classList.remove('highlight'), 600);
      if (window.tts) window.tts.speak(this.char);
    });

    container.appendChild(word);
    return word;
  }
}

class PinyinLine {
  constructor(text, customPinyin = {}, options = {}) {
    this.text = text;
    this.customPinyin = customPinyin;
    this.size = options.size || 'large';
    this.words = this._buildWords();
  }

  /**
   * ✅ 修复：拼音库失败时仍能渲染
   */
  _buildWords() {
    const words = [];
    for (const ch of this.text) {
      if (/[\u4e00-\u9fa5]/.test(ch)) {
        let pinyin = this.customPinyin[ch];
        let tone = 0;

        if (!pinyin && window.pinyinPro && typeof window.pinyinPro.pinyin === 'function') {
          try {
            const result = window.pinyinPro.pinyin(ch, {
              toneType: 'symbol',
              type: 'array'
            });
            if (result && result[0]) {
              const m = String(result[0]).match(/^([a-zA-ZüÜ]+)([1-5])?$/);
              if (m) {
                pinyin = m[1];
                tone = m[2] ? parseInt(m[2]) : 5;
              }
            }
          } catch (e) {
            console.warn('拼音转换失败:', ch, e);
          }
        }
        // 即使没拼音，也要把字渲染出来
        words.push({ char: ch, pinyin: pinyin || '', tone: tone || 0 });
      } else if (/[\s，。！？、；：""''《》（）]/.test(ch)) {
        words.push({ char: ch, isPunct: true });
      }
    }
    return words;
  }

  render(container) {
    const line = document.createElement('div');
    line.className = 'pinyin-line';

    for (const w of this.words) {
      if (w.isPunct) {
        const span = document.createElement('span');
        span.className = 'punct';
        span.textContent = w.char;
        line.appendChild(span);
      } else {
        const tzg = new TianZiGe(w.char, w.pinyin, w.tone, { size: this.size });
        tzg.render(line);
      }
    }
    container.appendChild(line);
    return line;
  }
}

window.TianZiGe = TianZiGe;
window.PinyinLine = PinyinLine;
console.log('✅ tianzige.js 加载完成');

}  // end if (typeof TianZiGe === 'undefined')
