(function () {
  // 当前页面 URL
  const page = location.href;

  // 浏览器可能不给 referrer，所以我们自己记录上一个页面
  const prevPage = sessionStorage.getItem("last_page") || document.referrer || "";

  // 更新 last_page（为下一次访问做准备）
  sessionStorage.setItem("last_page", page);

  // 延迟 1 秒，确保页面加载完成
  setTimeout(() => {
    fetch('https://huaxia-classroom.vercel.app/api/record-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page,
        referer: prevPage
      })
    }).catch(err => {
      console.error('visit-tracker error:', err);
    });
  }, 1000);
})();
