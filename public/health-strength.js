(function () {
  function renderList(sessions, tools) {
    const list = document.getElementById("strengthList");
    const groups = groupSessions(sessions, tools.labels);
    list.innerHTML = "";
    for (const group of groups) appendButton(list, group.label, summary(group), () => renderCategory(group, tools));
    if (!list.children.length) appendButton(list, tools.empty, "--", () => {});
  }

  function renderCategory(group, tools) {
    tools.openDetail(group.label);
    const detail = document.getElementById("detailView");
    tools.appendText(detail, summary(group));
    tools.appendSection(detail, "\u8bad\u7ec3\u65e5\u671f", group.sessions.map((session) => sessionButton(session, group, tools)));
  }

  function renderSession(session, group, tools) {
    tools.openDetail(date(session.started_at), { back: () => renderCategory(group, tools) });
    const detail = document.getElementById("detailView");
    const sets = session.sets || [];
    const volume = sets.reduce((sum, item) => sum + item.weight_kg * item.reps, 0);
    tools.appendText(detail, `${sets.length} \u7ec4 / ${Math.round(volume)} kg`);
    const table = document.createElement("div");
    table.className = "set-table";
    for (const set of sets) {
      const warmup = set.is_warmup ? " / \u70ed\u8eab" : "";
      table.appendChild(row(tools.labels.exercise(set.exercise_name || set.name || set.exercise), `${set.weight_kg} kg x ${set.reps}${warmup}`, `#${set.set_index}`));
    }
    tools.appendSection(detail, "\u8bad\u7ec3\u660e\u7ec6", [table]);
  }

  function groupSessions(sessions, labels) {
    const map = new Map();
    for (const session of sessions || []) {
      for (const set of session.sets || []) {
        const raw = set.exercise_name || set.name || set.exercise;
        const key = normalize(raw);
        if (!key) continue;
        const group = ensureGroup(map, key, raw, labels);
        group.sets.push(set);
        group.volumeKg += set.weight_kg * set.reps;
        ensureGroupSession(group, session).sets.push(set);
      }
    }
    return [...map.values()].sort((a, b) => b.volumeKg - a.volumeKg);
  }

  function ensureGroup(map, key, raw, labels) {
    if (!map.has(key)) {
      map.set(key, { key, label: labels.exercise(raw), sessions: [], sessionRefs: new Map(), sets: [], volumeKg: 0 });
    }
    return map.get(key);
  }

  function ensureGroupSession(group, session) {
    const ref = session.id || session.started_at || `${group.key}:${group.sessions.length}`;
    if (!group.sessionRefs.has(ref)) {
      const groupedSession = { ...session, sets: [] };
      group.sessionRefs.set(ref, groupedSession);
      group.sessions.push(groupedSession);
    }
    return group.sessionRefs.get(ref);
  }

  function sessionButton(session, group, tools) {
    const sets = session.sets || [];
    const volume = sets.reduce((sum, item) => sum + item.weight_kg * item.reps, 0);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-button";
    button.appendChild(row(date(session.started_at), `${sets.length} \u7ec4 / ${Math.round(volume)} kg`, ""));
    button.addEventListener("click", () => renderSession(session, group, tools));
    return button;
  }

  function appendButton(parent, title, value, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-button";
    button.appendChild(row(title, value, ""));
    button.addEventListener("click", onClick);
    parent.appendChild(button);
  }

  function row(title, value, meta) {
    const node = document.createElement("div");
    node.className = "detail-row";
    const left = document.createElement("span");
    left.textContent = title || "--";
    const right = document.createElement("strong");
    right.textContent = value || "--";
    const small = document.createElement("small");
    small.textContent = meta || "";
    node.append(left, right, small);
    return node;
  }

  function summary(group) {
    return `${group.sessions.length} \u6b21 / ${group.sets.length} \u7ec4 / ${Math.round(group.volumeKg)} kg`;
  }

  function normalize(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9+.-]+/g, " ").trim(); }
  function date(value) { return value ? String(value).slice(0, 10) : ""; }

  window.HealthStrength = { groupSessions, renderList };
})();
