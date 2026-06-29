// 前端访问记录：调用 Vercel 后端 API
(function () {
  // 当前页面 URL
  const page = location.href;

  // 延迟 1 秒，确保页面加载完成
  setTimeout(() => {
    fetch('/api/record-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page: page
      })
    }).catch(err => {
      console.error('visit-tracker error:', err);
    });
  }, 1000);
})();
