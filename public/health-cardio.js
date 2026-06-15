(function () {
  function renderList(sessions, tools) {
    const list = document.getElementById("cardioList");
    const groups = groupSessions(sessions, tools.labels);
    list.innerHTML = "";
    for (const group of groups) appendButton(list, group.label, summary(group), () => renderCategory(group, tools));
    if (!list.children.length) appendButton(list, tools.empty, "--", () => {});
  }

  function renderCategory(group, tools) {
    tools.openDetail(group.label);
    const detail = document.getElementById("detailView");
    tools.appendText(detail, summary(group));
    tools.appendSection(detail, "\u6709\u6c27\u8bb0\u5f55", group.sessions.map((session) => sessionButton(session, group, tools)));
  }

  function renderDetail(session, group, tools) {
    tools.openDetail(tools.labels.activity(session.activity_type), { back: () => renderCategory(group, tools) });
    const detail = document.getElementById("detailView");
    tools.appendText(detail, session.notes || "");
    tools.appendSection(detail, "\u6709\u6c27\u660e\u7ec6", [
      row("\u65f6\u95f4", `${date(session.started_at)} ${duration(session.duration_seconds)}`, ""),
      row("\u8ddd\u79bb", session.distance_km == null ? "--" : `${session.distance_km} km`, ""),
      row("\u5e73\u5747\u5fc3\u7387", session.average_heart_rate_bpm ? `${session.average_heart_rate_bpm} bpm` : "--", ""),
      row("\u70ed\u91cf", session.active_energy_kcal ? `${session.active_energy_kcal} kcal` : "--", ""),
      row("\u4e3b\u89c2\u8017\u80fd", session.perceived_exertion ?? "--", "")
    ]);
  }

  function groupSessions(sessions, labels) {
    const map = new Map();
    for (const session of sessions || []) {
      const key = normalize(session.activity_type);
      if (!key) continue;
      const group = ensureGroup(map, key, session.activity_type, labels);
      group.sessions.push(session);
      group.distanceKm += session.distance_km || 0;
      group.durationSeconds += session.duration_seconds || 0;
    }
    return [...map.values()].sort((a, b) => b.sessions.length - a.sessions.length || b.distanceKm - a.distanceKm);
  }

  function ensureGroup(map, key, raw, labels) {
    if (!map.has(key)) map.set(key, { key, label: labels.activity(raw), sessions: [], distanceKm: 0, durationSeconds: 0 });
    return map.get(key);
  }

  function sessionButton(session, group, tools) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-button";
    button.appendChild(row(date(session.started_at), sessionSummary(session), ""));
    button.addEventListener("click", () => renderDetail(session, group, tools));
    return button;
  }

  function appendButton(parent, titleText, value, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-button";
    button.appendChild(row(titleText, value, ""));
    button.addEventListener("click", onClick);
    parent.appendChild(button);
  }

  function row(titleText, value, meta) {
    const node = document.createElement("div");
    node.className = "detail-row";
    const left = document.createElement("span");
    left.textContent = titleText || "--";
    const right = document.createElement("strong");
    right.textContent = value || "--";
    const small = document.createElement("small");
    small.textContent = meta || "";
    node.append(left, right, small);
    return node;
  }

  function sessionSummary(session) {
    return `${session.distance_km || 0} km / ${duration(session.duration_seconds) || "--"}`;
  }

  function summary(group) {
    return `${group.sessions.length} \u6b21 / ${round(group.distanceKm)} km / ${duration(group.durationSeconds) || "--"}`;
  }

  function round(value) { return Math.round(value * 100) / 100; }
  function normalize(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9+.-]+/g, " ").trim(); }
  function date(value) { return value ? String(value).slice(0, 10) : ""; }
  function duration(seconds) { return seconds ? `${Math.round(seconds / 60)} min` : ""; }

  window.HealthCardio = { groupSessions, renderList };
})();
