(function () {
  const params = new URLSearchParams(location.search);
  const workspaceId = params.get("workspace_id") || "";
  const launch = params.get("launch") || "";
  const initialPluginRoute = String(params.get("pluginRoute") || params.get("route") || params.get("pluginActionId") || "").trim().toLowerCase();
  const labels = window.HealthLabels;
  const state = { dashboard: null, strength: [], medications: [], medical: {}, view: "home", pluginRouteApplied: false, detailBack: null };
  const t = {
    app: "\u5065\u5eb7", workspace: "\u5de5\u4f5c\u533a", unbound: "\u672a\u7ed1\u5b9a",
    noToken: "\u7f3a\u5c11 launch token", noStrength: "\u6682\u65e0\u8bad\u7ec3\u8bb0\u5f55",
    medicalEmpty: "\u6682\u65e0\u533b\u7597\u65f6\u95f4\u7ebf", labs: "\u5316\u9a8c",
    events: "\u4e8b\u4ef6", risks: "\u98ce\u9669", findings: "\u4e34\u5e8a\u53d1\u73b0",
    sleep: "\u7761\u7720\u6062\u590d", riskHistory: "\u95ee\u9898\u8bc4\u4f30\u5386\u53f2",
    relatedLabs: "\u76f8\u5173\u68c0\u6d4b\u6570\u636e", relatedEvents: "\u76f8\u5173\u68c0\u67e5\u4e8b\u4ef6",
    relatedFindings: "\u76f8\u5173\u53d1\u73b0", setDetails: "\u8bad\u7ec3\u660e\u7ec6",
    medicationList: "\u5f53\u524d\u7528\u836f", noMedication: "\u6682\u65e0\u7528\u836f\u8bb0\u5f55"
  };
  document.getElementById("backButton").addEventListener("click", goBack);
  document.getElementById("medicationButton").addEventListener("click", renderMedicationList);
  window.addEventListener("message", handleHostMessage);
  load();
  async function load() {
    setText("workspaceLabel", `${t.workspace}\uff1a${workspaceId || t.unbound}`);
    if (!launch) return renderEmpty(t.noToken);
    try {
      const [dashboard, strength, medications, risks, labs, events, findings, sleep] = await Promise.all([
        fetchJson("/api/v1/dashboard"), fetchJson("/api/v1/strength/sessions"),
        fetchJson("/api/v1/profile/medications"),
        fetchJson("/api/v1/medical/risk-profiles"), fetchJson("/api/v1/medical/lab-results"),
        fetchJson("/api/v1/medical/clinical-events"), fetchJson("/api/v1/medical/clinical-findings"),
        fetchJson("/api/v1/medical/recovery-sleep")
      ]);
      state.dashboard = dashboard;
      state.strength = strength.sessions || [];
      state.medications = medications.medications || [];
      state.medical = { risks: risks.records || [], labs: labs.records || [], events: events.records || [], findings: findings.records || [], sleep: sleep.records || [] };
      renderHome();
      applyInitialPluginRoute();
    } catch (error) {
      renderEmpty(error.message);
    }
  }
  async function fetchJson(path) {
    const query = new URLSearchParams({ launch });
    if (workspaceId) query.set("workspace_id", workspaceId);
    const response = await fetch(`${path}?${query.toString()}`);
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error?.message || "load failed");
    return data;
  }
  function renderHome() {
    state.view = "home"; state.detailBack = null;
    document.getElementById("homeView").classList.remove("hidden");
    document.getElementById("detailView").classList.add("hidden");
    document.getElementById("backButton").classList.add("hidden");
    setText("pageTitle", t.app);
    const data = state.dashboard;
    setText("workspaceLabel", `${t.workspace}\uff1a${data.workspace.hermesWorkspaceId || data.workspace.id}`);
    setText("heightValue", data.profile.height_cm ? `${data.profile.height_cm} cm` : "--");
    setText("targetWeightValue", data.profile.target_weight_kg ? `${data.profile.target_weight_kg} kg` : "--");
    setText("medicationCount", String(data.medications?.activeCount || 0));
    setText("weeklyVolume", `${data.strength.weeklyVolumeKg || 0} kg`);
    setText("latestStrength", data.strength.latestSession ? fmtDate(data.strength.latestSession.started_at) : t.noStrength);
    renderBars(data.strength.chart || []);
    window.HealthApple.render(data.appleHealth || {});
    window.HealthStrength.renderList(state.strength, { labels, empty: t.noStrength, openDetail, appendText, appendSection });
    renderMetric("weightMetric", "weightTrend", data.body.latest.weight);
    renderMetric("fatMetric", "fatTrend", data.body.latest.body_fat_percentage);
    renderMetric("waistMetric", "waistTrend", data.body.latest.waist_circumference);
    renderMedicalList();
    postNavigation(false);
  }
  function renderMedicalList() {
    const counts = state.dashboard.medical?.counts || {};
    setText("medicalCounts", `${t.labs} ${counts.labResults || 0}\uff0c${t.events} ${counts.clinicalEvents || 0}\uff0c${t.risks} ${counts.riskProfiles || 0}`);
    const list = document.getElementById("medicalList");
    list.innerHTML = "";
    for (const risk of state.medical.risks.slice().sort((a, b) => (a.priority || 99) - (b.priority || 99))) {
      appendButton(list, labels.risk(risk), `${labels.status(risk.status || "active")} / P${risk.priority || "-"}`, () => renderIssueDetail(risk));
    }
    if (!list.children.length) appendButton(list, t.medicalEmpty, "--", () => {});
  }
  function renderIssueDetail(risk) {
    openDetail(labels.risk(risk));
    const detail = document.getElementById("detailView");
    appendText(detail, risk.summary || risk.evidence || "");
    appendSection(detail, t.riskHistory, state.medical.risks.filter((item) => item.risk_key === risk.risk_key).map(riskRow));
    appendSection(detail, t.relatedLabs, relatedLabs(risk).map(labRow));
    appendSection(detail, t.relatedFindings, relatedFindings(risk).map(findingRow));
    appendSection(detail, t.relatedEvents, relatedEvents(risk).map(eventRow));
    if (/sleep|autonomic|recovery/i.test(risk.risk_key)) appendSection(detail, t.sleep, state.medical.sleep.map(sleepRow));
  }
  function renderMedicationList() {
    openDetail(t.medicationList);
    const detail = document.getElementById("detailView");
    const rows = state.medications.map(medicationRow);
    appendSection(detail, t.medicationList, rows.length ? rows : [emptyRow(t.noMedication)]);
  }
  function applyInitialPluginRoute() {
    if (!initialPluginRoute || state.pluginRouteApplied) return;
    state.pluginRouteApplied = true;
    if (initialPluginRoute === "medication") {
      renderMedicationList();
      return;
    }
    if (initialPluginRoute === "report" || initialPluginRoute === "trend" || initialPluginRoute === "record_metric") {
      const firstRisk = state.medical.risks[0];
      if (firstRisk) renderIssueDetail(firstRisk);
      return;
    }
    if (initialPluginRoute === "workout") {
      const firstStrength = state.strength[0];
      if (firstStrength) {
        openDetail(t.setDetails);
        appendText(document.getElementById("detailView"), fmtDate(firstStrength.started_at));
      }
      return;
    }
    if (initialPluginRoute === "advice") {
      const firstRisk = state.medical.risks[0];
      if (firstRisk) renderIssueDetail(firstRisk);
    }
  }
  function relatedLabs(risk) {
    const tests = labTestsFor(risk).map((name) => name.toLowerCase());
    return state.medical.labs.filter((lab) => tests.some((name) => String(lab.test_name || "").toLowerCase().includes(name)));
  }
  function labTestsFor(risk) {
    const key = `${risk.risk_key} ${risk.label}`.toLowerCase();
    if (/alt|liver|fatty/.test(key)) return ["ALT", "AST", "GGT", "ALP", "Bilirubin"];
    if (/kidney|renal|uric/.test(key)) return ["Creatinine", "Cystatin", "eGFR", "UACR", "Uric Acid"];
    if (/testosterone|libido|endocrine/.test(key)) return ["Testosterone", "LH", "Prolactin", "Estradiol", "TSH"];
    if (/metabolic|ldl|apob|atherosclerosis|coronary|carotid|lad/.test(key)) return ["LDL-C", "ApoB", "Triglycerides", "HDL-C", "Total Cholesterol", "HbA1c", "Fasting Glucose"];
    return [];
  }
  function relatedFindings(risk) {
    const words = issueWords(risk);
    return state.medical.findings.filter((item) => words.some((word) => `${item.finding_key} ${item.title} ${item.evidence}`.toLowerCase().includes(word)));
  }
  function relatedEvents(risk) {
    const words = issueWords(risk);
    return state.medical.events.filter((item) => words.some((word) => `${item.event_type} ${item.title} ${item.summary}`.toLowerCase().includes(word))).slice(0, 8);
  }

  function issueWords(risk) {
    return String(`${risk.risk_key} ${risk.label}`).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);
  }

  function openDetail(title, options = {}) {
    state.view = "detail"; state.detailBack = typeof options.back === "function" ? options.back : null;
    setText("pageTitle", title || t.app);
    document.getElementById("homeView").classList.add("hidden");
    const detail = document.getElementById("detailView");
    detail.classList.remove("hidden");
    detail.innerHTML = "";
    document.getElementById("backButton").classList.remove("hidden");
    postNavigation(true);
  }

  function goBack() { if (state.view !== "detail") return; const back = state.detailBack; state.detailBack = null; back ? back() : renderHome(); }

  function appendSection(parent, title, nodes) {
    const section = document.createElement("section");
    section.className = "detail-section";
    const heading = document.createElement("h2");
    heading.textContent = title;
    section.appendChild(heading);
    if (!nodes.length) appendRow(section, "--", "--", "");
    for (const node of nodes) section.appendChild(node);
    parent.appendChild(section);
  }

  function appendText(parent, text) {
    if (!text) return;
    const p = document.createElement("p");
    p.className = "detail-note";
    p.textContent = text;
    parent.appendChild(p);
  }
  function appendButton(parent, title, value, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-button";
    appendRow(button, title, value, "");
    button.addEventListener("click", onClick);
    parent.appendChild(button);
  }

  function appendRow(parent, title, value, date) {
    const row = document.createElement("div");
    row.className = "detail-row";
    const left = document.createElement("span");
    left.textContent = title || "--";
    const right = document.createElement("strong");
    right.textContent = value || "--";
    const small = document.createElement("small");
    small.textContent = date || "";
    row.append(left, right, small);
    parent.appendChild(row);
    return row;
  }

  function riskRow(row) { return appendDetached(labels.risk(row), labels.status(row.status || "active"), row.assessed_at); }
  function labRow(row) { return appendDetached(labels.lab(row.test_name), `${row.value ?? "--"} ${row.unit || ""}`, row.observed_at); }
  function findingRow(row) { return appendDetached(row.title, row.status || "--", row.observed_at); }
  function eventRow(row) { return appendDetached(row.title, row.event_type || "--", row.event_date); }
  function sleepRow(row) { return appendDetached(row.source_type || t.sleep, `${row.total_sleep_minutes || "--"} min`, row.sleep_start); }
  function appendDetached(title, value, date) { const box = document.createElement("div"); appendRow(box, title, value, fmtDate(date)); return box.firstChild; }
  function emptyRow(title) { const box = document.createElement("div"); appendRow(box, title, "--", ""); return box.firstChild; }
  function medicationRow(row) {
    const dose = [row.dose_value ?? row.doseValue, row.dose_unit || row.doseUnit].filter(Boolean).join(" ");
    const meta = [labels.status(row.status), labels.frequency(row.frequency), fmtDate(row.started_at)].filter(Boolean).join(" / ");
    const box = document.createElement("div");
    appendRow(box, labels.medication(row.name), dose || labels.status(row.status), meta);
    return box.firstChild;
  }

  function renderEmpty(message) { setText("latestStrength", message || t.noStrength); renderBars([]); postNavigation(false); }
  function renderMetric(valueId, trendId, item) { setText(valueId, item ? `${item.value} ${displayUnit(item.unit)}` : "--"); document.getElementById(trendId).style.opacity = item ? "1" : ".28"; }
  function displayUnit(unit) { return unit === "percent" ? "%" : unit || ""; }
  function fmtDate(value) { return value ? String(value).slice(0, 10) : ""; }

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
    if (message.type === "hermes.plugin.theme") {
      window.HealthTheme.applyTheme(message.theme);
      if (message.fontSize) window.HealthTheme.applyPluginFontSize(message.fontSize);
    }
    if (message.type === "hermes.plugin.back") {
      const handled = state.view === "detail";
      if (handled) goBack(); window.parent.postMessage({ type: "health.plugin.back_result", handled }, "*");
    }
  }

  function postNavigation(canGoBack) { window.parent.postMessage({ type: "health.plugin.navigation", canGoBack, route: location.pathname }, "*"); }
  function setText(id, text) { document.getElementById(id).textContent = text; }
})();
