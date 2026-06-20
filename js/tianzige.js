/**
 * 田字格 + 拼音 + 声调 组件（升级版）
 * ✨ 修复：声调符号位置 + 支持大字号
 */

class TianZiGe {
  constructor(char, pinyin = '', tone = 0, options = {}) {
    this.char = char;
    this.pinyin = pinyin;
    this.tone = tone;
    this.size = options.size || 'normal';
  }

  render(container) {
    const word = document.createElement('div');
    word.className = `tianzige-word ${this.size === 'large' ? 'large' : ''}`;
    word.title = '点我读：' + this.char;

    if (this.pinyin) {
      const pinyinRow = document.createElement('div');
      pinyinRow.className = 'pinyin-row';
      const toneSpan = document.createElement('span');
      toneSpan.className = 'tone tone-' + this.tone;
      toneSpan.textContent = this.pinyin;
      pinyinRow.appendChild(toneSpan);
      word.appendChild(pinyinRow);
    } else {
      const empty = document.createElement('div');
      empty.className = 'pinyin-row';
      word.appendChild(empty);
    }

    const cell = document.createElement('div');
    cell.className = 'tianzige-cell';
    cell.textContent = this.char;
    word.appendChild(cell);

    word.addEventListener('click', e => {
      e.stopPropagation();
      cell.classList.add('highlight');
      setTimeout(() => cell.classList.remove('highlight'), 600);
      window.tts.speak(this.char);
    });

    container.appendChild(word);
    return word;
  }
}

class PinyinLine {
  constructor(text, customPinyin = {}, options = {}) {
    this.text = text;
    this.customPinyin = customPinyin;
    this.size = options.size || 'normal';
    this.words = this._buildWords();
  }

  _buildWords() {
    const words = [];
    for (const ch of this.text) {
      if (/[\u4e00-\u9fa5]/.test(ch)) {
        let pinyin = this.customPinyin[ch];
        let tone = 0;

        if (!pinyin && window.pinyinPro) {
          try {
            const result = window.pinyinPro.pinyin(ch, {
              toneType: 'symbol',
              type: 'array'
            });
            if (result && result[0]) {
              const m = result[0].match(/^([a-zA-ZüÜ]+)([1-5])?$/);
              if (m) {
                pinyin = m[1];
                tone = m[2] ? parseInt(m[2]) : 5;
              }
            }
          } catch (e) {}
        }
        words.push({ char: ch, pinyin, tone });
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
