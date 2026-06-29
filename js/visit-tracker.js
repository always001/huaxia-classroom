(function () {
  const page = location.href;
  const referer = document.referrer || "";

  setTimeout(() => {
    fetch('https://huaxia-classroom.vercel.app/api/record-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page,
        referer
      })
    }).catch(err => {
      console.error('visit-tracker error:', err);
    });
  }, 1000);
})();
