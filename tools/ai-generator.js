#!/usr/bin/env node
/**
 * 华夏小课堂 - AI 文章自动生成器
 *
 * 用法：
 *   # 方式1：本地规则引擎（无需联网，无 API key）
 *   node ai-generator.js --topic "七夕节" --category festivals --grade 2
 *
 *   # 方式2：AI 大模型（需要 API key）
 *   OPENAI_API_KEY=sk-xxx node ai-generator.js --topic "七夕节" --ai --category festivals
 *
 *   # 方式3：批量生成
 *   node ai-generator.js --batch topics.txt --category festivals
 *
 *   # 方式4：交互模式（命令行问答）
 *   node ai-generator.js --interactive
 */

const fs = require('fs');
const path = require('path');

// ===== 配置 =====
const CONFIG = {
  outputDir: path.join(__dirname, '..', 'content'),
  apiBase: process.env.AI_API_BASE || 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.AI_MODEL || 'gpt-4o-mini',
  enableAI: process.argv.includes('--ai'),
};

// ===== 解析命令行参数 =====
function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

const args = parseArgs();

// ===== 模板库（无 AI 也能生成） =====
const TEMPLATES = {
  festivals: {
    iconMap: {
      '春节': '🧧', '元旦': '🎆', '元宵': '🏮', '清明': '🌿',
      '端午': '🐉', '七夕': '💞', '中秋': '🌕', '重阳': '🌼',
      '冬至': '🥟', '腊八': '🍚', '小年': '🧨', '寒食': '🔥'
    },
    generate: (topic, grade) => {
      const icon = TEMPLATES.festivals.iconMap[topic] || '🎊';
      const dateMap = {
        '春节': '正月初一', '元宵': '正月十五', '清明': '四月初五前后',
        '端午': '五月初五', '七夕': '七月初七', '中秋': '八月十五',
        '重阳': '九月初九', '冬至': '十二月二十二前后'
      };
      const date = dateMap[topic] || '___';

      return {
        id: pinyinId(topic),
        title: `${topic}：${topicEmoji(topic)}里的中国`,
        subtitle: `了解中国传统文化`,
        category: 'festivals',
        coverIcon: icon,
        grade: grade || 2,
        version: '1.0.0',
        lastUpdated: today(),
        content: [
          {
            type: 'paragraph',
            text: `小朋友，你知道吗？每年农历${date}，是中国传统的${topic}！`
          },
          {
            type: 'paragraph',
            text: `${topic}是中国非常重要的节日，这一天有好多有趣的习俗呢！`
          },
          {
            type: 'story',
            text: `传说很久很久以前，${topic}这一天发生了一个动人的故事……（请在此补充具体故事内容）`
          },
          {
            type: 'image',
            icon: icon,
            caption: `${topic}的标志性景象`
          },
          {
            type: 'knowledge',
            title: '📚 文化小知识',
            items: [
              `${topic}的来历（请补充）`,
              `${topic}的主要习俗：……`,
              `${topic}的传统美食：……`,
              `${topic}的诗词：……`
            ]
          },
          {
            type: 'poem',
            title: '古诗欣赏',
            content: '请在此填入与' + topic + '相关的古诗\n（每行一句）',
            author: '作者'
          },
          {
            type: 'vocabulary',
            title: '生字乐园',
            words: []
          },
          {
            type: 'question',
            text: `小朋友，你最喜欢${topic}的哪个习俗？为什么？`
          }
        ]
      };
    }
  },

  heroes: {
    generate: (topic, grade) => ({
      id: pinyinId(topic),
      title: `${topic}：中华历史上的璀璨明星`,
      subtitle: '了解一位伟大的人物',
      category: 'heroes',
      coverIcon: '🦸',
      grade: grade || 4,
      version: '1.0.0',
      lastUpdated: today(),
      content: [
        {
          type: 'paragraph',
          text: `今天我们来认识一位中华历史上的伟大人物——${topic}！`
        },
        {
          type: 'paragraph',
          text: `${topic}做过很多了不起的事情，留下了许多感人的故事。`
        },
        {
          type: 'story',
          text: `在很久很久以前，${topic}……（请在此补充${topic}的生平故事）`
        },
        {
          type: 'knowledge',
          title: `📚 ${topic}的成就`,
          items: [
            '成就1（请补充）',
            '成就2（请补充）',
            '代表作品或名言（请补充）',
            '对后世的影响（请补充）'
          ]
        },
        {
          type: 'vocabulary',
          title: '生字乐园',
          words: []
        },
        {
          type: 'question',
          text: `小朋友，你最佩服${topic}的哪一点？`
        }
      ]
    })
  },

  idioms: {
    generate: (topic, grade) => ({
      id: pinyinId(topic),
      title: `成语「${topic}」的故事`,
      subtitle: '四字成语背后的智慧',
      category: 'idioms',
      coverIcon: '📖',
      grade: grade || 3,
      version: '1.0.0',
      lastUpdated: today(),
      content: [
        {
          type: 'paragraph',
          text: `今天我们来学习一个有趣的成语——「${topic}」！`
        },
        {
          type: 'story',
          text: `「${topic}」这个成语来自……（请补充成语典故）`
        },
        {
          type: 'knowledge',
          title: '📚 成语释义',
          items: [
            '字面意思：（请补充）',
            '引申意思：（请补充）',
            '造个句子：……'
          ]
        },
        {
          type: 'vocabulary',
          title: '生字乐园',
          words: topic.split('').map(ch => ({
            char: ch,
            pinyin: getPinyin(ch),
            tone: getTone(ch)
          }))
        },
        {
          type: 'question',
          text: `你能用「${topic}」造一个句子吗？`
        }
      ]
    })
  },

  poems: {
    generate: (topic, grade) => ({
      id: pinyinId(topic),
      title: topic,
      subtitle: '古诗欣赏',
      category: 'poems',
      coverIcon: '🖌️',
      grade: grade || 3,
      version: '1.0.0',
      lastUpdated: today(),
      content: [
        {
          type: 'paragraph',
          text: '今天我们来读一首美丽的古诗，感受中国传统文化的韵味。'
        },
        {
          type: 'poem',
          title: '古诗原文',
          content: '请在此填入古诗内容\n（每行一句）',
          author: '作者'
        },
        {
          type: 'knowledge',
          title: '📚 诗词大意',
          items: [
            '第一句意思：（请补充）',
            '第二句意思：（请补充）',
            '整首诗表达的情感：（请补充）'
          ]
        },
        {
          type: 'vocabulary',
          title: '生字乐园',
          words: []
        },
        {
          type: 'question',
          text: '你最喜欢诗中的哪一句？为什么？'
        }
      ]
    })
  },

  food: {
    generate: (topic, grade) => ({
      id: pinyinId(topic),
      title: `${topic}：中国味道`,
      subtitle: '品尝中华美食文化',
      category: 'food',
      coverIcon: '🥟',
      grade: grade || 2,
      version: '1.0.0',
      lastUpdated: today(),
      content: [
        {
          type: 'paragraph',
          text: `小朋友，你喜欢吃${topic}吗？${topic}可是中国有名的传统美食哦！`
        },
        {
          type: 'story',
          text: `传说${topic}的来历是……（请补充${topic}的故事）`
        },
        {
          type: 'knowledge',
          title: `📚 ${topic}小知识`,
          items: [
            '主要食材：（请补充）',
            '做法：（请补充）',
            '主要在什么节日吃：（请补充）',
            '不同地方的${topic}有什么不同：（请补充）'
          ]
        },
        {
          type: 'image',
          icon: '🍽️',
          caption: `美味的${topic}`
        },
        {
          type: 'vocabulary',
          title: '生字乐园',
          words: []
        },
        {
          type: 'question',
          text: `小朋友，你最喜欢怎么吃${topic}？`
        }
      ]
    })
  },

  inventions: {
    generate: (topic, grade) => ({
      id: pinyinId(topic),
      title: `${topic}：改变世界的中国智慧`,
      subtitle: '了解伟大的中国发明',
      category: 'inventions',
      coverIcon: '⚙️',
      grade: grade || 4,
      version: '1.0.0',
      lastUpdated: today(),
      content: [
        {
          type: 'paragraph',
          text: `${topic}是中国古代伟大的发明之一，对全世界都有深远的影响！`
        },
        {
          type: 'story',
          text: `${topic}的故事是这样的……（请补充发明过程）`
        },
        {
          type: 'knowledge',
          title: '📚 伟大之处',
          items: [
            '发明者：（请补充）',
            '发明时间：（请补充）',
            '对中国的影响：（请补充）',
            '对世界的影响：（请补充）'
          ]
        },
        {
          type: 'vocabulary',
          title: '生字乐园',
          words: []
        },
        {
          type: 'question',
          text: '如果没有这个发明，你的生活会变成什么样？'
        }
      ]
    })
  }
};

// ===== 工具函数 =====

function pinyinId(text) {
  // 简单的拼音 ID 生成（实际应使用 pinyin 库）
  return text.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').slice(0, 20) || 'muban';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function topicEmoji(topic) {
  const map = {
    '春节': '团圆', '端午': '龙舟与粽香', '中秋': '月圆人团圆',
    '清明': '踏青', '元宵': '灯火', '七夕': '鹊桥', '重阳': '登高'
  };
  return map[topic] || '传统';
}

function getPinyin(ch) {
  // 简化版，实际请使用 pinyin-pro 库
  const simpleMap = {
    '画': 'huà', '蛇': 'shé', '添': 'tiān', '足': 'zú',
    '守': 'shǒu', '株': 'zhū', '待': 'dài', '兔': 'tù'
  };
  return simpleMap[ch] || ch;
}

function getTone(ch) {
  return 1;
}

// ===== 自动填充拼音（如果项目里有 pinyin-pro） =====
function fillPinyin(article) {
  try {
    const { pinyin } = require('pinyin-pro');
    const fillWord = w => {
      if (w.pinyin) return;
      try {
        const r = pinyin(w.char, { toneType: 'symbol', type: 'array' });
        if (r && r[0]) {
          const m = r[0].match(/^([a-zA-ZüÜ]+)([1-5])?$/);
          if (m) { w.pinyin = m[1]; w.tone = m[2] ? parseInt(m[2]) : 5; }
        }
      } catch (e) {}
    };

    (article.content || []).forEach(b => {
      if (b.words && Array.isArray(b.words)) b.words.forEach(fillWord);
    });
  } catch (e) {
    console.log('💡 提示：安装 pinyin-pro 可自动填充拼音（npm install pinyin-pro）');
  }
}

// ===== AI 大模型生成 =====

async function generateWithAI(topic, category, grade) {
  if (!CONFIG.apiKey) {
    throw new Error('使用 AI 生成需要设置 OPENAI_API_KEY 环境变量');
  }

  const prompt = buildPrompt(topic, category, grade);
  console.log('🤖 正在调用 AI...');

  const response = await fetch(`${CONFIG.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.apiKey}`
    },
    body: JSON.stringify({
      model: CONFIG.model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的儿童教育内容创作者，擅长为小学生编写中华文化学习材料。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API 错误: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

function buildPrompt(topic, category, grade) {
  return `请为${grade}年级小学生写一篇关于"${topic}"的中华文化学习文章。

要求：
1. 输出标准 JSON 格式，不要任何额外文字
2. 符合以下 schema：
{
  "id": "英文id",
  "title": "吸引人的标题",
  "subtitle": "副标题",
  "category": "${category}",
  "coverIcon": "一个表情符号",
  "grade": ${grade},
  "version": "1.0.0",
  "lastUpdated": "${today()}",
  "content": [
    {"type": "paragraph", "text": "100字左右的引子"},
    {"type": "story", "text": "一个有趣的历史故事，200-300字"},
    {"type": "knowledge", "title": "📚 文化小知识", "items": ["3-5条知识点"]},
    {"type": "poem", "title": "古诗欣赏", "content": "一首相关古诗", "author": "作者"},
    {"type": "vocabulary", "title": "生字乐园", "words": [{"char": "字", "pinyin": "拼音", "tone": 声调数字}]},
    {"type": "question", "text": "一个思考题"}
  ]
}

3. 内容积极健康，符合儿童认知
4. 字数控制在 600-800 字
5. 生字 4-8 个，标注准确拼音`;
}

// ===== 批量生成 =====

async function batchGenerate(file) {
  if (!fs.existsSync(file)) {
    console.error('❌ 文件不存在:', file);
    process.exit(1);
  }
  const topics = fs.readFileSync(file, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  console.log(`📦 批量生成 ${topics.length} 篇文章...\n`);
  for (const t of topics) {
    try {
      const article = await generateArticle(t, args.category || 'festivals', args.grade || 2);
      saveArticle(article);
      console.log(`✅ ${t} → ${article.id}.json`);
    } catch (e) {
      console.error(`❌ ${t}: ${e.message}`);
    }
  }
}

// ===== 交互模式 =====

async function interactive() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const ask = q => new Promise(res => readline.question(q, res));

  console.log('🎮 交互模式启动（输入 Ctrl+C 退出）\n');
  while (true) {
    const topic = await ask('📌 请输入主题（如：七夕节、孔子、画蛇添足）：');
    if (!topic) continue;
    const category = await ask('📂 分类（festivals/heroes/idioms，默认 festivals）：') || 'festivals';
    const grade = parseInt(await ask('📚 年级（1-6，默认 2）：') || '2');
    const useAI = (await ask('🤖 使用 AI？(y/N)：') || 'N').toLowerCase() === 'y';

    try {
      CONFIG.enableAI = useAI;
      const article = await generateArticle(topic, category, grade);
      saveArticle(article);
      console.log(`✅ 已生成：${article.id}.json\n`);
    } catch (e) {
      console.error('❌ 错误:', e.message, '\n');
    }
  }
}

// ===== 主生成函数 =====

async function generateArticle(topic, category, grade) {
  let article;

  if (CONFIG.enableAI) {
    article = await generateWithAI(topic, category, grade);
  } else {
    const template = TEMPLATES[category] || TEMPLATES.festivals;
    article = template.generate(topic, grade);
  }

  // 自动填充拼音
  fillPinyin(article);

  // 校验
  validate(article);

  return article;
}

// ===== 校验 =====

function validate(article) {
  const errors = [];
  if (!article.id) errors.push('缺少 id');
  if (!article.title) errors.push('缺少 title');
  if (!article.category) errors.push('缺少 category');
  if (!article.content || article.content.length === 0) errors.push('内容为空');

  if (errors.length > 0) {
    console.warn('⚠️ 校验警告:', errors.join(', '));
  }
}

// ===== 保存 =====

function saveArticle(article) {
  const dir = path.join(CONFIG.outputDir, article.category);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${article.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(article, null, 2), 'utf-8');
  console.log(`💾 已保存：${path.relative(process.cwd(), filePath)}`);

  // 同时更新 index.json
  updateIndex(article);
}

function updateIndex(article) {
  const indexPath = path.join(CONFIG.outputDir, article.category, 'index.json');
  let index = [];
  if (fs.existsSync(indexPath)) {
    try { index = JSON.parse(fs.readFileSync(indexPath, 'utf-8')); }
    catch (e) { index = []; }
  }
  if (!index.find(i => i.id === article.id)) {
    index.push({
      id: article.id,
      title: article.title.replace(/[:：].*$/, '').trim(),
      icon: article.coverIcon || '📄',
      desc: article.subtitle || ''
    });
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`📋 已更新 index.json（${index.length}篇）`);
  }
}

// ===== 主入口 =====

async function main() {
  console.log('🏮 华夏小课堂 · AI 文章生成器\n');

  if (args.help || args.h) {
    printHelp();
    return;
  }

  if (args.interactive || args.i) {
    return interactive();
  }

  if (args.batch) {
    return batchGenerate(args.batch);
  }

  if (!args.topic) {
    console.error('❌ 请提供 --topic 参数（或使用 --interactive 交互模式）');
    printHelp();
    process.exit(1);
  }

  const category = args.category || 'festivals';
  const grade = parseInt(args.grade) || 2;

  console.log(`📌 主题: ${args.topic}`);
  console.log(`📂 分类: ${category}`);
  console.log(`📚 年级: ${grade}`);
  console.log(`🤖 AI模式: ${CONFIG.enableAI ? '是' : '否（使用本地模板）'}\n`);

  const article = await generateArticle(args.topic, category, grade);
  saveArticle(article);

  console.log('\n✅ 完成！刷新浏览器即可看到新文章。');
}

function printHelp() {
  console.log(`
用法：
  node ai-generator.js --topic <主题> [选项]

选项：
  --topic <文本>      文章主题（必填）
  --category <类型>   分类：festivals/heroes/idioms/poems/food/inventions
  --grade <数字>      年级：1-6
  --ai                使用 AI 大模型（需要 OPENAI_API_KEY）
  --batch <文件>      批量模式：从文件读取主题列表
  --interactive       交互模式：命令行问答
  --help              显示帮助

示例：
  node ai-generator.js --topic "七夕节" --category festivals --grade 2
  node ai-generator.js --topic "孔子" --category heroes --ai
  node ai-generator.js --batch my-topics.txt
  node ai-generator.js --interactive

环境变量（AI模式）：
  OPENAI_API_KEY    OpenAI 或兼容 API 的密钥
  AI_API_BASE       API 地址（默认 OpenAI）
  AI_MODEL          模型名称（默认 gpt-4o-mini）
`);
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
