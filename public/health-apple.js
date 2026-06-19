(function () {
  function render(data) {
    const latest = data.latestDaily || {};
    const times = syncTimeLines(data || {});
    const synced = Boolean(latest.summary_date || (data.workouts || []).length || data.latestSleep || data.latestEcg || times.length);
    set("appleHealthDate", synced ? "\u6570\u636e\u6e90\u72b6\u6001" : "\u6682\u65e0\u539f\u751f\u5065\u5eb7\u6570\u636e");
    set("appleSyncStatus", synced ? "\u5df2\u540c\u6b65" : "\u672a\u540c\u6b65");
    set("appleSyncDetail", synced ? "Apple Health \u5df2\u540c\u6b65\uff0c\u53ef\u4f9b AI \u5206\u6790\uff1b\u5177\u4f53\u6307\u6807\u8bf7\u5728 Apple Health \u67e5\u770b" : "\u6388\u6743\u540e\u4ec5\u4f5c\u4e3a AI \u53ef\u7528\u6570\u636e\u5e95\u5ea7");
    set("appleSyncTimes", synced ? times.join("\n") : "\u6682\u65e0\u540c\u6b65\u65f6\u95f4");
  }

  function set(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function syncTimeLines(data) {
    const state = data.syncState || data.sync_state || {};
    return [
      stateLine("\u65e5\u6c47\u603b", state.daily_summaries, data.latestDaily, ["summary_date"]),
      stateLine("Workout", state.workouts, first((data.workouts || [])[0], data.latestWorkout), ["ended_at", "started_at"]),
      stateLine("\u7761\u7720", state.sleep_records, data.latestSleep, ["sleep_end", "sleep_start"]),
      stateLine("ECG", state.ecg_records, data.latestEcg, ["recorded_at"]),
      stateLine("\u8eab\u4f53\u6307\u6807", state.body_measurements, first(data.latestBodyMeasurement, data.latestBody), ["measured_at"]),
      stateLine("\u4f53\u5f81", state.vitals, data.latestVital, ["measured_at"])
    ].filter(Boolean);
  }

  function stateLine(label, state, fallback, recordKeys) {
    const latestUpdated = state && state.latest_updated_at;
    const latestRecord = (state && state.latest_record_at) || firstValue(fallback, recordKeys);
    const count = state && state.record_count ? `\uff0c${state.record_count} \u6761` : "";
    if (latestUpdated) return `${label}\uff1a\u540c\u6b65 ${formatTime(latestUpdated)}${latestRecord ? `\uff0c\u6570\u636e ${formatTime(latestRecord)}` : ""}${count}`;
    if (latestRecord) return `${label}\uff1a\u6570\u636e ${formatTime(latestRecord)}${count}`;
    return "";
  }

  function firstValue(row, keys) {
    if (!row) return "";
    for (const key of keys) {
      if (row[key]) return row[key];
    }
    return "";
  }

  function first() {
    for (const item of arguments) {
      if (item) return item;
    }
    return null;
  }

  function formatTime(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hour = pad(date.getHours());
      const minute = pad(date.getMinutes());
      return `${month}-${day} ${hour}:${minute}`;
    }
    return text.slice(0, 16).replace("T", " ");
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  window.HealthApple = { render };
})();
