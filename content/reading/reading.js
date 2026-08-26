/* ---------------------------------------------------------
   华夏小书房 · 终极版 reading.js
   功能列表：
   ✔ 自动分页
   ✔ 左右滑动翻页
   ✔ AI 朗读
   ✔ 夜间模式
   ✔ 护眼模式
   ✔ 字体调节
   ✔ 阅读进度条
   ✔ 阅读历史
   ✔ 阅读时长统计
   ✔ 阅读成就系统
   ✔ 阅读排行榜
   ✔ 每日一句
   ✔ 文章分类系统
   ✔ 搜索功能
   ✔ GitHub 阅读进度同步（二维码）
   ✔ AI 封面图生成（含 fallback）
--------------------------------------------------------- */

// ⭐ 页面类型识别（首页 / 阅读页 / 设置中心）
const PAGE_TYPE = document.body.dataset.page || "reading";

function showCacheSize() {
  const el = document.getElementById("cacheInfo");
  if (!el) return;

  let total = 0;
  for (let key in localStorage) {
    const value = localStorage.getItem(key);
    total += value ? value.length : 0;
  }

  el.textContent = "📦 当前缓存大小：" + (total / 1024).toFixed(2) + " KB";
}

function showReadingSummary() {
  const el = document.getElementById("readingSummary");
  if (!el) return;

  const history = JSON.parse(localStorage.getItem("reading_history") || "[]");
  el.textContent = "📖 已阅读文章数量：" + history.length;
}


// ⭐ 全局错误提示（可保留）
window.onerror = function (msg, url, line, col, error) {
  const box = document.createElement("div");
  box.style.position = "fixed";
  box.style.bottom = "0";
  box.style.left = "0";
  box.style.right = "0";
  box.style.background = "rgba(255,0,0,0.8)";
  box.style.color = "#fff";
  box.style.padding = "10px";
  box.style.fontSize = "14px";
  box.style.zIndex = "99999";
  box.innerText = "JS错误: " + msg;
  document.body.appendChild(box);
};

// 设置中心
//document.getElementById("menu-btn").onclick = () => {
  //const panel = document.getElementById("menu-panel");
  //panel.style.display = (panel.style.display === "block") ? "none" : "block";
//};

// 顶部：菜单按钮只在有它的页面生效
const menuBtn = document.getElementById("menu-btn");
if (menuBtn) {
  menuBtn.onclick = () => {
    const panel = document.getElementById("menu-panel");
    if (!panel) return;
    panel.style.display = (panel.style.display === "block") ? "none" : "block";
  };
}


// 🟩 一键清空所有阅读数据
function resetAllReadingData() {
  if (!confirm("确定要清空所有阅读数据吗？")) return;

  localStorage.clear();
  alert("已重置！");
  location.reload();
}

// ✅ 方案 B：在 reading.js 里补一个 resetReadingSystem（推荐）
// 设置中心页面的【 重置阅读系统（安全）按钮】
function resetReadingSystem() {
  resetAllReadingData();
}


let READING_MODE = localStorage.getItem("reading_mode") || "scroll"; 
// 可选：scroll / paged


/* -------------------------
   1. 自动分页
------------------------- */
/*
let pages = [];
let currentPage = 0;

function initPaging() {
  const article = document.getElementById("articleContent");
  if (!article) return;

  const children = Array.from(article.children);
  pages = [];
  let page = [];

  children.forEach(el => {
    page.push(el.outerHTML);
    if (page.length >= 3) {
      pages.push(page.join(""));
      page = [];
    }
  });

  if (page.length > 0) pages.push(page.join(""));

  showPage(0);
}

function showPage(index) {
  if (!pages.length) return;
  currentPage = Math.max(0, Math.min(index, pages.length - 1));

  const article = document.getElementById("articleContent");
  article.innerHTML = pages[currentPage];

  document.getElementById("pageInfo").textContent =
    `第 ${currentPage + 1} / ${pages.length} 页`;

  updateProgress();
  saveReadingState();
}

document.getElementById("nextPage")?.addEventListener("click", () => showPage(currentPage + 1));
document.getElementById("prevPage")?.addEventListener("click", () => showPage(currentPage - 1));
*/



// ⭐ 3. 滚动模式（scroll 模式）
function initModeToggle() {
  const btn = document.getElementById("toggleMode");
  if (!btn) return;

  btn.onclick = () => {
    READING_MODE = (READING_MODE === "scroll") ? "paged" : "scroll";
    localStorage.setItem("reading_mode", READING_MODE);
    location.reload(); // ⭐ 切换模式后刷新页面
  };
}

function initScrollMode() {
  if (typeof ARTICLE_ID === "undefined") return;   // ⭐ 防止在书架页面报错
  
  // ⭐ 隐藏分页按钮
  const controls = document.getElementById("pagedControls");
  if (controls) controls.style.display = "none";
  
  const article = document.getElementById("articleContent");
  if (!article) return;

  // 恢复滚动位置
  const savedY = Number(localStorage.getItem("scroll_" + ARTICLE_ID) || 0);
  if (savedY > 0) article.scrollTop = savedY;

  // 滚动进度条
  article.addEventListener("scroll", () => {
    const h = article.scrollHeight - article.clientHeight;
    const y = article.scrollTop;
    const percent = Math.min(100, Math.round((y / h) * 100));

    document.getElementById("progress-inner").style.width = percent + "%";
    localStorage.setItem("progress_" + ARTICLE_ID, percent);
    localStorage.setItem("scroll_" + ARTICLE_ID, y);
  });
}


// ⭐ 4. 分页模式（paged 模式）
let pages = [];
let currentPage = 0;

function initPagedMode() {
  const article = document.getElementById("articleContent");
  if (!article) return;   // ⭐ 首页没有文章内容，直接退出
  autoPaging();
  showPage(0);
  initSwipePaging();
  
  // ⭐ 显示分页按钮
  const controls = document.getElementById("pagedControls");
  if (controls) controls.style.display = "flex";

  // ⭐ 按钮事件
  document.getElementById("prevPageBtn").onclick = () => showPage(currentPage - 1);
  document.getElementById("nextPageBtn").onclick = () => showPage(currentPage + 1);
}

function autoPaging() {
  const article = document.getElementById("articleContent");
  if (!article) return;   // ⭐ 首页没有文章内容，直接退出
  const pageHeight = article.clientHeight;   // ⭐ 必须在清空前测量
  const nodes = Array.from(article.children);

  pages = [];
  let curPage = document.createElement("div");
  curPage.className = "page";

  article.innerHTML = "";
  article.appendChild(curPage);

  nodes.forEach(node => {
    curPage.appendChild(node);

    if (curPage.scrollHeight > pageHeight) {
      curPage.removeChild(node);
      pages.push(curPage);

      curPage = document.createElement("div");
      curPage.className = "page";
      curPage.appendChild(node);
      article.appendChild(curPage);
    }
  });

  pages.push(curPage);
}

function showPage(index) {
  const article = document.getElementById("articleContent");

  currentPage = Math.max(0, Math.min(index, pages.length - 1));
  article.innerHTML = "";
  article.appendChild(pages[currentPage]);

  // ⭐ 页码显示
  const info = document.getElementById("pageInfo");
  if (info) info.textContent = `第 ${currentPage + 1} / ${pages.length} 页`;

  // ⭐ 进度条
  const percent = ((currentPage + 1) / pages.length) * 100;
  document.getElementById("progress-inner").style.width = percent + "%";

  // ⭐ 保存进度
  localStorage.setItem("reading_state_" + ARTICLE_ID, currentPage);
  localStorage.setItem("progress_" + ARTICLE_ID, percent);
}

function initSwipePaging() {
  const article = document.getElementById("articleContent");
  let startX = 0;

  article.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  article.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const delta = endX - startX;

    if (Math.abs(delta) < 50) return;

    if (delta < 0) showPage(currentPage + 1);
    else showPage(currentPage - 1);
  });
}


/* -------------------------
   2. 左右滑动翻页
------------------------- */
/*
function initSwipePaging() {
  const article = document.getElementById("articleContent");
  if (!article) return;

  let startX = 0;

  article.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  article.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const delta = endX - startX;

    if (Math.abs(delta) < 50) return;

    if (delta < 0) showPage(currentPage + 1);
    else showPage(currentPage - 1);
  });
}
*/

/* -------------------------
   ⭐ 1. 滚动阅读进度条
------------------------- */
function initScrollProgress() {
  const article = document.getElementById("articleContent");
  const bar = document.getElementById("progress-inner");
  if (!article || !bar || typeof ARTICLE_ID === "undefined") return;

  article.addEventListener("scroll", () => {
    const h = article.scrollHeight - article.clientHeight;
    const y = article.scrollTop;
    const percent = Math.min(100, Math.round((y / h) * 100));

    bar.style.width = percent + "%";
    localStorage.setItem("progress_" + ARTICLE_ID, percent);
  });
}

/* -------------------------
   3. AI 朗读
------------------------- */
let synth = window.speechSynthesis;
let utter;

function initReading() {
  const btnRead = document.getElementById("btnRead");
  const btnStop = document.getElementById("btnStop");

  if (!btnRead || !btnStop) return;

  btnRead.onclick = () => {
    const text = document.getElementById("articleContent").innerText;
    utter = new SpeechSynthesisUtterance(text);
    utter.lang = "zh-CN";
    utter.rate = 1.0;
    synth.speak(utter);
  };

  btnStop.onclick = () => synth.cancel();
}

/* -------------------------
   4. 夜间模式
------------------------- */
function initNightMode() {
  const btn = document.getElementById('toggleNight');
  if (!btn) return;

  btn.onclick = () => {
    document.body.classList.toggle('night');
    localStorage.setItem('night_mode', document.body.classList.contains('night'));
  };

  // 自动恢复夜间模式
  const saved = localStorage.getItem('night_mode');
  if (saved === 'true') {
    document.body.classList.add('night');
  }
}

/* -------------------------
   5. 护眼模式
------------------------- */
function initEyeMode() {
  const btn = document.getElementById("toggleEye");
  if (!btn) return;

  btn.onclick = () => {
    document.body.classList.toggle("body-eye");
    localStorage.setItem("eye_mode", document.body.classList.contains("body-eye"));
  };

  if (localStorage.getItem("eye_mode") === "true") {
    document.body.classList.add("body-eye");
  }
}

/* -------------------------
   6. 字体调节
------------------------- */
function initFontSize() {
  const plus = document.getElementById("fontPlus");
  const minus = document.getElementById("fontMinus");

  if (!plus || !minus) return;

  plus.onclick = () => {
    const size = parseInt(localStorage.getItem("font_size") || "17") + 2;
    //document.documentElement.style.fontSize = size + "px";
    document.documentElement.style.setProperty("--article-font-size", size + "px");
    localStorage.setItem("font_size", size);
  };

  minus.onclick = () => {
    const size = parseInt(localStorage.getItem("font_size") || "17") - 2;
    //document.documentElement.style.fontSize = size + "px";
    document.documentElement.style.setProperty("--article-font-size", size + "px");
    localStorage.setItem("font_size", size);
  };

  const saved = localStorage.getItem("font_size");
  //if (saved) document.documentElement.style.fontSize = saved + "px";
  if (saved) {
    document.documentElement.style.setProperty("--article-font-size", saved + "px");
  }
}

/* ---------------------------------
   ⭐ 原4. 自动生成封面图（AI）
--------------------------------- */
/*
async function generateCover(title) {
  const key = 'cover_' + title;
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  // 这里你可以换成你自己的 AI 图片 API
  const res = await fetch("https://image.pollinations.ai/prompt/" + encodeURIComponent(title));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  localStorage.setItem(key, url);
  return url;
}
*/

/*
async function generateCover(title) {
  const key = 'cover_' + title;
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  const sizes = [
    [256, 384],   // 尝试 3:4 小图
    [300, 420],   // 你的原始尺寸
    [512, 768]    // 高清大图
  ];

  for (const [w, h] of sizes) {
    const url =
      "https://image.pollinations.ai/prompt/" +
      encodeURIComponent(title) +
      `?width=${w}&height=${h}&style=book-cover&model=flux&v=${Date.now()}`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const blob = await res.blob();
      if (blob.size === 0) continue; // 空图，跳过

      const objectURL = URL.createObjectURL(blob);
      localStorage.setItem(key, objectURL);
      return objectURL;
    } catch (e) {
      continue;
    }
  }

  return "fallback.jpg";
}
*/

// 🧪 我帮你写一个微信浏览器可用的封面生成函数
// ✔ 使用 picsum.photos（稳定、微信可用）
/*
async function generateCover(title) {
  const key = 'cover_' + title;
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  // 使用稳定的图片服务
  const url = `https://picsum.photos/seed/${encodeURIComponent(title)}/300/420`;

  // 直接缓存 URL，不使用 blob
  localStorage.setItem(key, url);
  return url;
}
*/

// 🧪 我给你一个微信浏览器 100% 可用的版本
// ✔ generateCover() 只返回你自己的域名图片
async function generateCover(title) {
  const key = 'cover_' + title;
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  // 你的 GitHub Pages 图片地址
  //const url = `https://huaxia-tech.github.io/covers/${encodeURIComponent(title)}.jpg`;
  const url = `https://huaxia-tech.github.io/huaxia-classroom/covers/${encodeURIComponent(title)}.jpg`;

  localStorage.setItem(key, url);
  return url;
}
// 把封面图片上传到：huaxia-tech.github.io/covers/ 



/* ----------------------------------------------
   原4的延续. ⭐ 直接可用的封面生成器（JS 版本）
---------------------------------------------- */
//async function generateLocalCover(title) {
// ⭐ 本地封面生成器（不要在这里写任何注释破坏语法）
/*
async function generateLocalCover(title, category = "学习") {
  const key = 'cover_local_' + title;
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  // 封面尺寸（3:4）
  const width = 256;
  const height = 384;

  // 创建 Canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // 自动生成背景色（根据标题哈希）
  //function hashColor(str) {
  // 渐变背景（根据标题生成颜色）
  function hashHue(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    //const hue = Math.abs(hash % 360);
    //return `hsl(${hue}, 60%, 70%)`;
    return Math.abs(hash % 360);
  }

  //ctx.fillStyle = hashColor(title);
  const hue = hashHue(title);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  //gradient.addColorStop(0, `hsl(${hue}, 70%, 75%)`);
  gradient.addColorStop(0, `hsl(${hue}, 70%, 80%)`);
  //gradient.addColorStop(1, `hsl(${hue + 20}, 70%, 65%)`);
  gradient.addColorStop(1, `hsl(${hue + 25}, 70%, 65%)`);
  ctx.fillStyle = gradient;
  
  ctx.fillRect(0, 0, width, height);
  
  // 轻微纹理（噪点）
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);

  // 圆角遮罩
  const radius = 20;
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // 标题文字
  //ctx.fillStyle = "#333";
  ctx.fillStyle = "#222";
  //ctx.font = "bold 28px sans-serif";
  ctx.font = "bold 26px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";

  // 自动换行
  function wrapText(text, x, y, maxWidth, lineHeight) {
    //const words = text.split("");
    const chars = text.split("");
    let line = "";
    //for (let n = 0; n < words.length; n++) {
    for (let c of chars) {
      //const testLine = line + words[n];
      const test = line + c;
      //const metrics = ctx.measureText(testLine);
      //if (metrics.width > maxWidth) {
      if (ctx.measureText(test).width > maxWidth) {
        ctx.fillText(line, x, y);
        //line = words[n];
        line = c;
        y += lineHeight;
      } else {
        //line = testLine;
        line = test;
      }
    }
    ctx.fillText(line, x, y);
  }

  //wrapText(title, width / 2, height / 2, width * 0.8, 36);
  wrapText(title, width / 2, height / 2 - 20, width * 0.8, 34);
  
  // 分类标签★増
  //ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  //ctx.font = "20px sans-serif";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText(category, width / 2, height - 40);

  // 转成图片 URL
  const url = canvas.toDataURL("image/png");
  localStorage.setItem(key, url);
  return url;
}
*/

// 🟩 微信浏览器稳定版：generateLocalCover（最终版）
async function generateLocalCover(title, category = "学习") {
  console.log("generateLocalCover called:", title);
  const width = 256;
  const height = 384;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // 背景色（根据标题生成稳定色调）
  function hashHue(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
  }

  const hue = hashHue(title);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${hue}, 70%, 80%)`);
  gradient.addColorStop(1, `hsl(${hue + 25}, 70%, 65%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 轻微噪点纹理（让封面更像真实纸张）
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);

  // 圆角遮罩
  const radius = 20;
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // 标题文字
  ctx.fillStyle = "#222";
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.textAlign = "center";

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const chars = text.split("");
    let line = "";
    for (let c of chars) {
      const test = line + c;
      if (ctx.measureText(test).width > maxWidth) {
        ctx.fillText(line, x, y);
        line = c;
        y += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, y);
  }

  wrapText(title, width / 2, height / 2 - 20, width * 0.8, 34);

  // 分类标签
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText(category, width / 2, height - 40);

  // 返回 Base64 图片（微信浏览器 100% 支持）
  //return canvas.toDataURL("image/png");
  // 🚨 微信浏览器稳定版：使用 JPEG + 降低质量
  return canvas.toDataURL("image/jpeg", 0.75);
}



/* -------------------------
   7. 阅读进度条
------------------------- */
function updateProgress() {
  const inner = document.getElementById("progress-inner");
  if (!inner || !pages.length) return;

  const percent = ((currentPage + 1) / pages.length) * 100;
  inner.style.width = percent + "%";
}

/* -------------------------
   8. 阅读历史
------------------------- */
function saveReadingState() {
  if (typeof ARTICLE_ID === "undefined") return;

  localStorage.setItem(`reading_state_${ARTICLE_ID}`, currentPage);

  const history = JSON.parse(localStorage.getItem("reading_history") || "[]");

  const title = document.getElementById("article-title")?.innerText || ARTICLE_ID;

  const item = {
    id: ARTICLE_ID,
    title,
    time: Date.now()
  };

  const filtered = history.filter(h => h.id !== ARTICLE_ID);
  filtered.unshift(item);

  localStorage.setItem("reading_history", JSON.stringify(filtered.slice(0, 20)));
}


/*
function loadHistory() {
  const list = document.getElementById("recent-list");
  if (!list) return;

  const history = JSON.parse(localStorage.getItem("reading_history") || "[]");

  history.forEach(h => {
    const timeKey = `reading_time_${h.id}`;
    const seconds = Number(localStorage.getItem(timeKey) || 0);
    const mins = Math.floor(seconds / 60);

    const div = document.createElement("div");
    div.className = "recent-item";
    div.innerHTML = `
      <p>
        <a href="${h.id}.html">${h.title}</a>
        · ${new Date(h.time).toLocaleString()}
        · 阅读约 ${mins} 分钟
      </p>
    `;
    list.appendChild(div);
  });
}
*/


/* -------------------------
   🟩 完整可用的最近阅读（去重 + 按时间排序）
------------------------- */
function loadHistory() {
  const list = document.getElementById("recent-list");
  if (!list) return;

  const history = JSON.parse(localStorage.getItem("reading_history") || "[]");

  // ⭐ 去重：按文章 ID，只保留最新的一次阅读记录
  const unique = {};
  //history.forEach(h => {
  history.slice().reverse().forEach(h => {
    unique[h.id] = h; // 后写入的覆盖前面的 → 保留最新时间
  });

  // ⭐ 转成数组并按时间倒序排序
  const sorted = Object.values(unique).sort((a, b) => b.time - a.time);

  // ⭐ 渲染最近阅读
  list.innerHTML = sorted.map(h => {
    const timeKey = `reading_time_${h.id}`;
    const seconds = Number(localStorage.getItem(timeKey) || 0);
    const mins = Math.floor(seconds / 60);

    return `
      <div class="recent-item">
        <p>
          <a href="${h.id}.html">${h.title}</a>
          · ${new Date(h.time).toLocaleString()}
          · 阅读约 ${mins} 分钟
        </p>
        
        <button class="recent-read-btn" onclick="location.href='${h.id}.html'" hidden>
          继续阅读
        </button>
      </div>
    `;
  }).join("");
}


/* -------------------------
   9. 阅读时长统计
------------------------- */
function initReadingTimer() {
  if (typeof ARTICLE_ID === "undefined") return;

  const key = `reading_time_${ARTICLE_ID}`;
  let seconds = Number(localStorage.getItem(key) || 0);

  setInterval(() => {
    seconds += 1;
    localStorage.setItem(key, seconds);
  }, 1000);
}

/* -------------------------
   10. 阅读成就系统
------------------------- */
function calcAchievements() {
  const history = JSON.parse(localStorage.getItem("reading_history") || "[]");
  const totalArticles = history.length;

  let totalSeconds = 0;
  history.forEach(h => {
    const key = `reading_time_${h.id}`;
    totalSeconds += Number(localStorage.getItem(key) || 0);
  });

  const badges = [];

  if (totalArticles >= 1) badges.push("入门读者");
  if (totalArticles >= 5) badges.push("小书房常客");
  if (totalSeconds >= 60 * 30) badges.push("半小时阅读达人");
  if (totalSeconds >= 60 * 120) badges.push("深度阅读者");

  localStorage.setItem("reading_badges", JSON.stringify(badges));
  return badges;
}

function showAchievements() {
  const container = document.getElementById("achievements");
  if (!container) return;

  //const badges = JSON.parse(localStorage.getItem("reading_badges") || "[]") || calcAchievements();
  
  let badges = JSON.parse(localStorage.getItem("reading_badges") || "[]");
  // ⭐ 如果没有成就 → 重新计算
  if (!badges.length) badges = calcAchievements();

  container.innerHTML = badges
    .map(b => `<span class="badge">${b}</span>`)
    .join(" ");
}

/* -------------------------
   11. 阅读排行榜
------------------------- */
/*
function loadRanking() {
  const container = document.getElementById("ranking");
  if (!container) return;

  const history = JSON.parse(localStorage.getItem("reading_history") || "[]");

  const stats = history.map(h => {
    const key = `reading_time_${h.id}`;
    const seconds = Number(localStorage.getItem(key) || 0);
    return { id: h.id, title: h.title, seconds };
  }).filter(s => s.seconds > 0);

  stats.sort((a, b) => b.seconds - a.seconds);

  container.innerHTML = "";

  stats.slice(0, 5).forEach((s, index) => {
    const mins = Math.floor(s.seconds / 60);
    const div = document.createElement("div");
    div.className = "ranking-item";
    div.innerHTML = `
      <span class="rank-no">${index + 1}</span>
      <a href="${s.id}.html">${s.title}</a>
      <span class="rank-time"> · 阅读约 ${mins} 分钟</span>
    `;
    container.appendChild(div);
  });
}
*/


/* ---------------------------------------
   🟩 完整可用的排行榜（按文章 ID 去重）
--------------------------------------- */
function loadRanking() {
  const ranking = document.getElementById("ranking");
  if (!ranking) return;

  const history = JSON.parse(localStorage.getItem("reading_history") || "[]");

  // ⭐ 按文章 ID 统计次数（不会重复）
  const count = {};
  history.forEach(h => {
    if (!count[h.id]) {
      count[h.id] = {
        id: h.id,
        title: h.title,
        times: 0
      };
    }
    count[h.id].times++;
  });

  // ⭐ 排序（阅读次数从高到低）
  //const sorted = Object.values(count).sort((a, b) => b.times - a.times);
  // ⭐ 排序（阅读次数从高到低）限制数量（例如前 5 名）
  const sorted = Object.values(count)
  .sort((a, b) => b.times - a.times)
  .slice(0, 5);


  // ⭐ 渲染排行榜
  ranking.innerHTML = sorted.map(item => `
    <div class="rank-item">
      <b><a href="${item.id}.html">${item.title}</a></b> — ${item.times} 次
    </div>
  `).join("");
}


/* -------------------------
   12. 每日一句
------------------------- */
function initDailyQuote() {
  const el = document.getElementById("daily-quote");
  if (!el) return;

  const quotes = [
    "今天也要给自己一点安静的阅读时间。",
    "文字是安静的陪伴，也是温柔的力量。",
    "慢一点读，世界就会慢一点吵。",
    "每一页翻过去，都是和自己的一次对话。",
    "读书不是任务，是给心一点空间。"
  ];

  const today = new Date();
  const index = today.getDate() % quotes.length;

  el.textContent = quotes[index];
}

// 🟩 ① 添加一个“封面是否存在”检查函数（最小版本）
async function coverExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

// 🟩 第三步：添加评分函数（用户评分 → 自动更新）
function rateArticle(articleId, userScore) {
  const key = "rating_" + articleId;

  // 旧评分（如果没有则为 4.5）
  const oldRating = Number(localStorage.getItem(key) || 4.5);

  // 新评分 = (旧评分 + 用户评分) / 2
  const newRating = (oldRating + userScore) / 2;

  // 存入 localStorage
  localStorage.setItem(key, newRating.toFixed(2));

  // 刷新页面显示最新评分
  location.reload();
}


// 🟩 四、加入评分逻辑（JS）——可直接复制
function initRatingUI() {
  const box = document.querySelector(".rating-stars");
  if (!box) return;

  const articleId = box.dataset.articleId;
  const key = "rating_" + articleId;

  // 旧评分（如果没有则为 4.5）
  let rating = Number(localStorage.getItem(key) || 4.5);

  // ⭐ 初始化星星 DOM（一次性创建，不再 innerHTML 替换）
  box.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.textContent = "★";
    star.dataset.value = i;
    box.appendChild(star);
  }

  // ⭐ 根据评分更新星星状态
  function updateStars(score) {
    box.querySelectorAll("span").forEach(star => {
      //star.classList.toggle("active", Number(star.dataset.value) <= score);
      const value = Number(star.dataset.value);
      star.classList.remove("active", "half");

      if (value <= score) {
        star.classList.add("active");
      } else if (value - score === 0.5) {
        star.classList.add("half");
      }
    });
  }

  //updateStars(Math.round(rating));
  updateStars(rating);

  // ⭐ 鼠标移上去高亮
  box.addEventListener("mousemove", e => {
    //if (e.target.tagName === "SPAN") {
      //const value = Number(e.target.dataset.value);
      //updateStars(value);
    //}
    if (e.target.tagName !== "SPAN") return;

    const rect = e.target.getBoundingClientRect();
    const offset = e.clientX - rect.left;
    const half = offset < rect.width / 2;

    const value = Number(e.target.dataset.value);
    const hoverScore = half ? value - 0.5 : value;

    updateStars(hoverScore);
  });

  // ⭐ 鼠标移出恢复真实评分
  box.addEventListener("mouseleave", () => {
    //updateStars(Math.round(rating));
    updateStars(rating);
  });

  // ⭐ 点击评分
  box.addEventListener("click", e => {
    if (e.target.tagName !== "SPAN") return;

    //const userScore = Number(e.target.dataset.value);
    // 新评分 = (旧评分 + 用户评分) / 2
    //rating = (rating + userScore) / 2;
    // 存入 localStorage
    //localStorage.setItem(key, rating.toFixed(2));
    // 更新显示
    //updateStars(Math.round(rating));
    
    const rect = e.target.getBoundingClientRect();
    const offset = e.clientX - rect.left;
    const half = offset < rect.width / 2;

    const value = Number(e.target.dataset.value);
    const userScore = half ? value - 0.5 : value;

    rating = (rating + userScore) / 2;
    localStorage.setItem(key, rating.toFixed(2));

    updateStars(rating);

    // 刷新页面（让 reading_index 显示真实评分）
    location.reload();
  });
}

// ⭐ 初始化评分 UI
//initRatingUI();
// 🟩 四、加入评分逻辑（JS）——可直接复制


/* -------------------------
   13. 文章分类系统
------------------------- */
async function loadArticles() {
  console.log("loadArticles start");
  const list = document.getElementById("book-list");
  if (!list) return;

  //const res = await fetch("articles.json");
  const res = await fetch(`articles.json?v=${new Date().getTime()}`);
  const articles = await res.json();

  const groups = {};
  articles.forEach(a => {
    const cat = a.category || "未分类";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(a);
  });

  list.innerHTML = "";

  for (const cat in groups) {
    const section = document.createElement("div");
    section.className = "category-section";
    section.innerHTML = `<h3 class="category-title">${cat}</h3>`;
    const inner = document.createElement("div");
    //inner.className = "category-list";
    inner.className = "bookshelf";   // ⭐ 微信读书风格瀑布流布局

    for (const a of groups[cat]) {
      const card = document.createElement("div");
      card.className = "book-card";

      //let cover = "fallback.jpg"; // AI 封面图可接入 generateCover()
      //cover = await generateCover(a.title);
      // ⭐ 直接使用封面生成器
      //cover = await generateLocalCover(a.title);
      
      // ⭐ 本地封面生成（渐变 + 纹理 + 圆角）
      //const cover = await generateLocalCover(a.title, a.category);
      // ⭐ 优先使用 articles.json 指定的封面
      let cover = a.cover ? a.cover : null;

      // ⭐ 如果封面不存在，则 fallback 到自动生成
      //if (!cover) {
        //cover = await generateLocalCover(a.title, a.category);
      //}
      // ⭐ 如果封面路径存在 → 使用真实封面
      if (cover && await coverExists(cover)) {
        // ok
      } else {
        // ⭐ 如果不存在 → fallback 到自动生成封面
        cover = await generateLocalCover(a.title, a.category);
      }

      // ⭐ 阅读进度
      //const progress = localStorage.getItem("progress_" + a.id) || 0;
      const progress = Number(localStorage.getItem("progress_" + a.id) || 0);

      // ⭐ 阅读时长
      //const minutes = localStorage.getItem("minutes_" + a.id) || 0;
      
      //const minutes = Number(localStorage.getItem("minutes_" + a.id) || 0);
      const minutes = Math.floor(Number(localStorage.getItem("reading_time_" + a.id) || 0) / 60);

      // ⭐ 评分（如果 JSON 没写，就默认 4.5）
      //const rating = a.rating || 4.5;
      
      // ⭐ 真实评分系统
      let baseRating = a.rating || 4.5;  // JSON 初始评分
      let savedRating = Number(localStorage.getItem("rating_" + a.id) || 0);

      // ⭐ 如果有用户评分 → 使用真实评分
      let rating = savedRating > 0 ? savedRating : baseRating;
      
      // ⭐ 星星数量
      const stars = "★★★★★☆☆☆☆☆".slice(0, Math.round(rating));

      // ⭐ 卡片 HTML（微信读书风格）
      //card.innerHTML = `
        //<div class="book-cover">
          //<img src="${cover}" alt="${a.title}">
        //</div>
        //<div class="book-info">
          //<h2>${a.title}</h2>
          //<p>${a.desc}</p>
          //<a href="${a.id}.html">进入阅读</a>
        //</div>
      //`;
      card.innerHTML = `
        <img class="book-cover" src="${cover}" alt="${a.title}">

        <div class="book-title">${a.title}</div>

        <div class="book-meta">
          <span class="book-category">${a.category}</span>
          <span class="book-rating">${stars} ${rating.toFixed(1)}</span>
        </div>

        <div class="book-time">已阅读约 ${minutes} 分钟</div>

        <div class="progress-bar">
          <div class="progress-inner" style="width: ${progress || 0}%"></div>
        </div>

        <div class="book-actions">
          <button class="read-btn">继续阅读</button>
        </div>
      `;

      // ⭐ 点击事件（卡片或按钮都能进入阅读）
      card.addEventListener("click", (e) => {
        if (!e.target.classList.contains("read-btn")) {
          location.href = `${a.id}.html`;
        }
      });
      card.querySelector(".read-btn").addEventListener("click", () => {
        location.href = `${a.id}.html`;
      });
      
      inner.appendChild(card);
    }

    section.appendChild(inner);
    list.appendChild(section);
  }
}

/* -------------------------
   14. 搜索功能
------------------------- */
async function initSearch() {
  const input = document.getElementById("search-input");
  const result = document.getElementById("search-result");
  if (!input || !result) return;

  const res = await fetch("articles.json");
  const articles = await res.json();

  input.addEventListener("input", () => {
    const q = input.value.trim();
    result.innerHTML = "";
    if (!q) return;

    const lower = q.toLowerCase();
    const matched = articles.filter(a =>
      (a.title && a.title.toLowerCase().includes(lower)) ||
      (a.desc && a.desc.toLowerCase().includes(lower))
    );

    matched.forEach(a => {
      const div = document.createElement("div");
      div.className = "search-item";
      div.innerHTML = `
        <a href="${a.id}.html">${a.title}</a>
        <span> · ${a.desc}</span>
      `;
      result.appendChild(div);
    });
  });
}


function initSyncGithub() {
  const btn = document.getElementById("btnSync");
  const box = document.getElementById("sync-qrcode");
  if (!btn || !box || typeof ARTICLE_ID === "undefined") return;

  btn.onclick = () => {
    const stateKey = `reading_state_${ARTICLE_ID}`;
    const timeKey = `reading_time_${ARTICLE_ID}`;
    const progressKey = `progress_${ARTICLE_ID}`;

    const payload = {
      id: ARTICLE_ID,
      page: Number(localStorage.getItem(stateKey) || 0),
      percent: Number(localStorage.getItem(progressKey) || 0),
      seconds: Number(localStorage.getItem(timeKey) || 0),
      ts: Date.now()
    };

    const json = JSON.stringify(payload);
    const base64 = btoa(encodeURIComponent(json));

    box.innerHTML = "";
    new QRCode(box, {
      text: base64,
      width: 200,
      height: 200
    });
  };
}

// 主题
function initTheme() {
  const btnKindle = document.getElementById("themeKindle");
  const btnWechat = document.getElementById("themeWechat");
  if (!btnKindle || !btnWechat) return;

  const applyTheme = (name) => {
    document.body.classList.remove("theme-kindle", "theme-wechat");
    if (name) document.body.classList.add("theme-" + name);
    localStorage.setItem("reader_theme", name);
  };

  btnKindle.onclick = () => applyTheme("kindle");
  btnWechat.onclick = () => applyTheme("wechat");

  const saved = localStorage.getItem("reader_theme");
  if (saved) applyTheme(saved);
}


function showPageWithAnim(nextIndex, direction) {
  const article = document.getElementById("articleContent");
  if (!article) return;

  currentPage = Math.max(0, Math.min(nextIndex, pages.length - 1));
  article.innerHTML = "";
  const page = pages[currentPage];
  page.classList.remove("page-slide-left", "page-slide-right");

  if (direction === "next") page.classList.add("page-slide-left");
  if (direction === "prev") page.classList.add("page-slide-right");

  article.appendChild(page);

  const info = document.getElementById("pageInfo");
  if (info) info.textContent = `第 ${currentPage + 1} / ${pages.length} 页`;
}

/*
function applyModeCSS() {
  const article = document.getElementById("articleContent");

  if (READING_MODE === "scroll") {
    article.style.height = "auto";
    article.style.overflowY = "auto";
  } else {
    article.style.height = "70vh";
    article.style.overflow = "hidden";
  }
}
*/

function applyModeCSS() {
  const body = document.body;

  if (READING_MODE === "paged") {
    body.classList.add("paged-mode");
    body.classList.remove("scroll-mode");
  } else {
    body.classList.add("scroll-mode");
    body.classList.remove("paged-mode");
  }
}


function initReadingPage() {
  // ⭐ 以下是阅读页专用功能（首页 + 阅读页）
  initModeToggle();     // ⭐ 模式切换按钮
  applyModeCSS();

  if (READING_MODE === "scroll") {
    initScrollMode();   // ⭐ 滚动阅读模式
  } else {
    initPagedMode();    // ⭐ 分页阅读模式
  }

  // 通用功能（两种模式都需要）
  //initTheme();
  //showPageWithAnim(0, "next");
  initReading();
  initNightMode();
  initEyeMode();
  initFontSize();
  initReadingTimer();
  initDailyQuote();
  
  // ⭐⭐⭐ 所有 DOM 重建完毕后，再执行统计
  loadArticles();      // 生成文章卡片（也会重建 DOM）
  initSearch();
  initSyncGithub();
  
  // ⭐⭐⭐ 最后执行统计（不会再被覆盖）
  loadHistory();
  showAchievements();
  loadRanking();
  //loadArticles();
  //initSearch();
  //initSyncGithub();
  
  // ⭐⭐⭐ 再等一帧，让 DOM 完全稳定
  // ⭐⭐⭐ 再等两帧，让所有异步 DOM 重建完成
  setTimeout(() => {
    requestAnimationFrame(() => {
      console.log("initRatingUI running");
      initRatingUI();
    });
  }, 0);

};


/* -------------------------
   16. 启动所有功能
------------------------- */
window.onload = () => {

  // ⭐ 设置中心页面：只执行主题和重置功能
  if (PAGE_TYPE === "settings") {
    initTheme();
    
    showCacheSize();
    showReadingSummary();
    
    return;
  }
  
  // 首页 + 阅读页
  initReadingPage();
};


// ⭐⭐ 初始化评分 UI（必须放在 reading.js 最底部）
//document.addEventListener("DOMContentLoaded", () => {
  //initRatingUI();
//});

