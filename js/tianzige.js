/**
 * 田字格 + 拼音 + 声调 组件
 * 配合 pinyin-pro 自动转换拼音
 */

class TianZiGe {
  constructor(char, pinyin = '', tone = 0) {
    this.char = char;
    this.pinyin = pinyin;
    this.tone = tone;
  }

  render(container) {
    const word = document.createElement('div');
    word.className = 'tianzige-word';
    word.title = '点我读：' + this.char;

    // 拼音行
    if (this.pinyin) {
      const pinyinRow = document.createElement('div');
      pinyinRow.className = 'pinyin-row';
      const toneSpan = document.createElement('span');
      toneSpan.className = 'tone';
      // 声调符号
      const toneMarks = { 1: '¯', 2: '´', 3: 'ˇ', 4: '`', 5: '' };
      toneSpan.textContent = this.pinyin;
      toneSpan.setAttribute('data-tone', toneMarks[this.tone] || '');
      pinyinRow.appendChild(toneSpan);
      word.appendChild(pinyinRow);
    } else {
      const empty = document.createElement('div');
      empty.className = 'pinyin-row';
      word.appendChild(empty);
    }

    // 田字格
    const cell = document.createElement('div');
    cell.className = 'tianzige-cell';
    cell.textContent = this.char;
    word.appendChild(cell);

    // 点击朗读
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
  constructor(text, customPinyin = {}) {
    this.text = text;
    this.customPinyin = customPinyin;
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
          } catch (e) {
            console.warn('拼音转换失败:', ch, e);
          }
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
        const tzg = new TianZiGe(w.char, w.pinyin, w.tone);
        tzg.render(line);
      }
    }
    container.appendChild(line);
    return line;
  }
}

window.TianZiGe = TianZiGe;
window.PinyinLine = PinyinLine;
