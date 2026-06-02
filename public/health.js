(function () {
  const params = new URLSearchParams(location.search);
  const workspaceId = params.get("workspace_id") || "";
  const launch = params.get("launch") || "";

  document.getElementById("refreshButton").addEventListener("click", load);
  window.addEventListener("message", handleHostMessage);
  load();

  async function load() {
    document.getElementById("workspaceLabel").textContent = `工作区：${workspaceId || "未绑定"}`;
    if (!launch) {
      renderEmpty("缺少 launch token");
      return;
    }
    try {
      const query = new URLSearchParams({ launch });
      if (workspaceId) query.set("workspace_id", workspaceId);
      const response = await fetch(`/api/v1/dashboard?${query.toString()}`);
      const data = await response.json();
      if (!response.ok || data.ok === false) throw new Error(data.error?.message || "load failed");
      render(data);
    } catch (error) {
      renderEmpty(error.message);
    }
  }

  function render(data) {
    document.getElementById("workspaceLabel").textContent = `工作区：${data.workspace.hermesWorkspaceId || data.workspace.id}`;
    setText("heightValue", data.profile.height_cm ? `${data.profile.height_cm} cm` : "--");
    setText("targetWeightValue", data.profile.target_weight_kg ? `${data.profile.target_weight_kg} kg` : "--");
    setText("medicationCount", "0");
    setText("weeklyVolume", `${data.strength.weeklyVolumeKg || 0} kg`);
    setText("latestStrength", data.strength.latestSession ? data.strength.latestSession.started_at.slice(0, 10) : "暂无训练记录");
    renderBars(data.strength.chart || []);
    renderMetric("weightMetric", "weightTrend", data.body.latest.weight);
    renderMetric("fatMetric", "fatTrend", data.body.latest.body_fat_percentage);
    renderMetric("muscleMetric", "muscleTrend", data.body.latest.skeletal_muscle_mass);
    setText("pendingText", data.pendingReview ? `${data.pendingReview} 条导入候选等待确认` : "没有待确认的导入候选");
    postNavigation(false);
  }

  function renderEmpty(message) {
    setText("latestStrength", message || "暂无训练记录");
    renderBars([]);
    postNavigation(false);
  }

  function renderMetric(valueId, trendId, item) {
    setText(valueId, item ? `${item.value} ${displayUnit(item.unit)}` : "--");
    document.getElementById(trendId).style.opacity = item ? "1" : ".28";
  }

  function displayUnit(unit) {
    if (unit === "percent") return "%";
    return unit || "";
  }

  function renderBars(points) {
    const chart = document.getElementById("strengthChart");
    chart.innerHTML = "";
    const max = Math.max(1, ...points.map((point) => point.volumeKg));
    for (let index = 0; index < 6; index += 1) {
      const point = points[index] || { volumeKg: 0 };
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = `${Math.max(8, (point.volumeKg / max) * 100)}px`;
      chart.appendChild(bar);
    }
  }

  function handleHostMessage(event) {
    const message = event.data || {};
    if (message.type === "hermes.plugin.refresh") load();
    if (message.type === "hermes.plugin.theme") document.documentElement.dataset.theme = message.theme || "";
    if (message.type === "hermes.plugin.back") {
      window.parent.postMessage({ type: "health.plugin.back_result", handled: false }, "*");
    }
  }

  function postNavigation(canGoBack) {
    window.parent.postMessage({ type: "health.plugin.navigation", canGoBack, route: location.pathname }, "*");
  }

  function setText(id, text) {
    document.getElementById(id).textContent = text;
  }
})();
