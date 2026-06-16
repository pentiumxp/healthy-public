(function () {
  function render(data) {
    const latest = data.latestDaily || {};
    const synced = Boolean(latest.summary_date || (data.workouts || []).length || data.latestSleep || data.latestEcg);
    set("appleHealthDate", synced ? "\u6570\u636e\u6e90\u72b6\u6001" : "\u6682\u65e0\u539f\u751f\u5065\u5eb7\u6570\u636e");
    set("appleSyncStatus", synced ? "\u5df2\u540c\u6b65" : "\u672a\u540c\u6b65");
    set("appleSyncDetail", synced ? "Apple Health \u6570\u636e\u5df2\u53ef\u4f9b AI \u5206\u6790\u4f7f\u7528\uff0c\u5177\u4f53\u6307\u6807\u8bf7\u5728 Apple Health \u67e5\u770b" : "\u6388\u6743\u540e\u4ec5\u4f5c\u4e3a AI \u53ef\u7528\u6570\u636e\u5e95\u5ea7");
  }

  function set(id, text) {
    document.getElementById(id).textContent = text;
  }

  window.HealthApple = { render };
})();
