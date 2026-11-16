/* vis-timeline handles date geometry and stacking; this adapter supplies the historical records. */
(function () {
  "use strict";
  window.AlphaTimelineChart = function (root, data) {
    const DAY = 864e5;
    const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const T = value => Date.parse(value);
    const U = (year, month) => Date.UTC(year, month, 1);
    const esc = value => String(value).replace(/[&<>\"]/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[char]));
    const el = (tag, cls, html) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (html != null) node.innerHTML = html;
      return node;
    };
    const fmt = value => { const date = new Date(value); return date.getUTCDate() + " " + MON[date.getUTCMonth()] + " " + date.getUTCFullYear(); };
    const monthName = key => MON[+key.slice(5, 7) - 1] + " " + key.slice(0, 4);
    const link = (label, href) => '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + '</a><span class="vh"> (opens in a new tab)</span>';
    const panel = document.getElementById("tl-detail");
    const byDay = {};
    data.kia.forEach(man => (byDay[man.day] = byDay[man.day] || []).push(man));
    const primaryRoot = el("div", "tl-chart-primary");
    const memorialRoot = el("div", "tl-chart-memorial");
    root.append(primaryRoot, memorialRoot);
    let view = null, selected = null, trigger = null, timeline = null, memorialTimeline = null, mode = "history";
    const payloads = new Map();

    function patrolSummary(entry) {
      const killed = entry.losses.filter(man => man.kind === "killed").length;
      const later = entry.losses.filter(man => man.kind === "died_of_wounds").length;
      return [killed ? "Killed in action: " + killed + " from this patrol" : "", later ? later + " later died of wounds" : ""].filter(Boolean).join("; ") || "Casualty link not confirmed";
    }

    function lossConnection(man) {
      if (!man.patrol) return "These accounts do not establish which patrol or action led to his death.";
      const entry = data.events.find(event => event.href === man.patrol.href);
      const name = entry.team ? "Team " + entry.team : man.patrol.name;
      return (man.patrol.kind === "died_of_wounds" ? "Died later of wounds received on the patrol described in " : "Killed in action on the patrol described in ") + link(name, man.patrol.href) + ". " + link("Source account", man.patrol.source);
    }

    function clearSelection() {
      root.querySelectorAll(".is-selected").forEach(node => {
        node.classList.remove("is-selected");
        node.setAttribute("aria-expanded", "false");
      });
      selected = null;
    }
    function closeDetail(restore = false) {
      if (typeof panel.hidePopover === "function" && panel.matches(":popover-open")) panel.hidePopover();
      panel.hidden = true;
      clearSelection();
      if (restore && trigger && trigger.isConnected) trigger.focus({preventScroll: true});
    }
    panel.addEventListener("toggle", event => {
      if (event.newState === "closed" && !panel.matches(":popover-open")) { panel.hidden = true; clearSelection(); }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !panel.hidden) closeDetail(true);
    });

    function openDetail(button, item, event) {
      if (selected === item.key && !panel.hidden) { closeDetail(true); return; }
      closeDetail();
      selected = item.key;
      trigger = button;
      trigger.classList.add("is-selected");
      trigger.setAttribute("aria-expanded", "true");
      const stone = item.kind === "loss";
      panel.className = "tl-detail" + (stone ? " tl-stone" : "");
      let body = "";
      if (stone) {
        body = '<ul class="tl-men">' + item.men.map(man => '<li><i class="tl-square' + (man.outlined ? " outlined" : "") + '" aria-hidden="true"></i><div><p class="tl-man-name">' + (man.href ? link(man.name, man.href) : esc(man.name)) + '</p><p class="tl-man-details">' + fmt(T(man.day)) + " · " + esc(man.home) + ". " + esc(man.wall) + (man.outlined ? ". Killed in action after leaving Alpha Company for another unit." : "") + '</p><p class="tl-man-connection">' + lossConnection(man) + "</p></div></li>").join("") + "</ul><p>" + link("Wall of Honor", "alphakia.html") + "</p>";
      } else if (item.kind === "event") {
        const entry = item.value;
        const names = entry.losses.length ? '<section class="tl-stone tl-patrol-men"><h4>Men from this patrol on the Wall of Honor</h4><ul class="tl-men">' + entry.losses.map(man => '<li><div><p class="tl-man-name">' + (man.href ? link(man.name, man.href) : esc(man.name)) + '</p><p class="tl-man-details">' + fmt(T(man.day)) + (man.kind === "died_of_wounds" ? " · Later died of wounds" : "") + " · " + link("Account", man.source) + "</p></div></li>").join("") + "</ul></section>" : "";
        body = '<p class="tl-patrol-summary">' + esc(patrolSummary(entry)) + "</p>" + names + (entry.opening ? "<p>" + esc(entry.opening) + "</p>" : "") + '<ul class="tl-sources"><li>' + link("Read the full account", entry.href) + "</li>" + entry.links.map(source => "<li>" + link(source.t, source.h) + "</li>").join("") + "</ul>";
      } else if (item.kind === "movement") {
        body = "<p>" + esc(item.value.what) + "</p><p>" + link("3rd Reconnaissance Battalion Order of Battle", "3rdreconborderofbattle.html") + "</p>";
      } else {
        body = "<p>Alpha Company commander</p><p>" + link("Company commanders", "commanders.html") + "</p>";
      }
      const date = item.date + (stone ? " · " + item.men.length + (item.men.length === 1 ? " man" : " men") : "");
      panel.innerHTML = '<div class="tl-detail-head"><h3 id="tl-detail-title" tabindex="-1">' + esc(item.title) + '</h3><button type="button" class="tl-detail-close" aria-label="Close entry details">Close</button></div><p class="tl-detail-date">' + esc(date) + "</p>" + body;
      panel.hidden = false;
      if (typeof panel.showPopover === "function") panel.showPopover();
      const rect = trigger.getBoundingClientRect();
      const width = panel.offsetWidth, height = panel.offsetHeight;
      const left = rect.right + width + 16 <= innerWidth ? rect.right + 12 : Math.max(8, innerWidth - width - 12);
      panel.style.left = left + "px";
      panel.style.top = Math.max(8, Math.min(innerHeight - height - 8, rect.top)) + "px";
      panel.querySelector(".tl-detail-close").onclick = () => closeDetail(true);
      if (event.detail === 0) panel.querySelector("h3").focus({preventScroll: true});
    }

    function movementLabel(movement) {
      const matches = movement.what.match(/\b(?:Red Beach One|Chu Lai|Danang|Phu Bai|Dong Ha|Khe Sanh|Quang Tri|Cam Lo|Okinawa|Camp Pendleton)\b/gi) || [];
      const places = [];
      matches.forEach(place => { if (!places.some(value => value.toLowerCase() === place.toLowerCase())) places.push(place); });
      return places.length ? places.join(" · ") : movement.what;
    }

    function content(item) {
      const payload = payloads.get(item.id);
      const button = el("button", "tl-vis-entry" + (payload.kind === "loss" ? " tl-vis-loss" + (payload.period.length === 4 ? " tl-vis-loss-year" : "") : ""));
      if (payload.kind === "loss" && payload.period.length === 10) button.classList.add("tl-vis-loss-day");
      if (payload.edge) button.classList.add("tl-vis-loss-edge-" + payload.edge);
      button.type = "button";
      button.dataset.entryId = item.id;
      button.setAttribute("aria-controls", "tl-detail");
      button.setAttribute("aria-expanded", String(selected === item.id));
      if (selected === item.id) button.classList.add("is-selected");
      if (payload.kind === "loss") {
        button.setAttribute("aria-label", payload.date + ": read the names and patrol details of those killed in action");
        const dateLabel = payload.period.length === 4 ? payload.period : payload.period.length === 7 ? MON[+payload.period.slice(5, 7) - 1].slice(0, 3) + "<br>" + payload.period.slice(0, 4) : new Date(T(payload.period)).getUTCDate() + "<br>" + MON[+payload.period.slice(5, 7) - 1].slice(0, 3);
        button.innerHTML = '<time class="tl-vis-date">' + dateLabel + '</time><span class="tl-vis-marks" aria-hidden="true">' + payload.men.map(man => '<i class="' + (man.outlined ? "outlined" : "") + '"></i>').join("") + "</span>";
      } else button.innerHTML = "<strong>" + esc(payload.title) + '</strong><span class="tl-vis-date">' + esc(payload.date) + "</span>";
      button.onclick = event => { event.stopPropagation(); openDetail(button, payload, event); };
      return button;
    }

    function chartData() {
      payloads.clear();
      const items = [], groups = [];
      const add = (payload, item) => { payloads.set(payload.key, payload); items.push(Object.assign({id: payload.key, content: ""}, item)); };
      const labelledPoint = (start, className) => {
        const nearEnd = (start - view.start) / (view.end - view.start) > .65;
        return {start, type: "box", align: nearEnd ? "right" : "left", className: className + " tl-vis-labelled" + (nearEnd ? " tl-vis-label-before" : "")};
      };
      if (mode === "history") {
        groups.push({id: "events", content: "Patrols and losses", order: 1}, {id: "losses", content: "Killed in action", className: "tl-vis-memorial", order: 2});
        data.events.filter(event => T(event.end || event.day) >= view.start && T(event.day) < view.end).forEach(event => {
          add({kind: "event", key: "event-" + event.href, title: event.name, date: event.text, value: event}, Object.assign({group: "events"}, labelledPoint(Math.max(view.start, T(event.day)), "tl-vis-event")));
        });
        const annual = view.level === "war";
        const daily = view.level === "month" || view.end - view.start <= 93 * DAY;
        const groupsByDate = {};
        Object.keys(byDay).filter(day => T(day) >= view.start && T(day) < view.end).sort().forEach(day => {
          const key = annual ? day.slice(0, 4) : daily ? day : day.slice(0, 7);
          (groupsByDate[key] = groupsByDate[key] || []).push(...byDay[day]);
        });
        Object.entries(groupsByDate).forEach(([key, men]) => {
          const start = annual ? (Math.max(view.start, U(+key, 0)) + Math.min(view.end, U(+key + 1, 0))) / 2 : daily ? T(key) : (U(+key.slice(0, 4), +key.slice(5, 7) - 1) + U(+key.slice(0, 4), +key.slice(5, 7))) / 2;
          const position = (start - view.start) / (view.end - view.start);
          const edge = !annual && position > .95 ? "end" : !annual && position < .05 ? "start" : "";
          add({kind: "loss", key: "loss-" + key, title: "Alpha Company, killed in action", date: annual ? key : daily ? fmt(T(key)) : monthName(key), period: key, men, edge}, {group: "losses", start, type: "box", align: edge === "end" ? "right" : edge === "start" ? "left" : "center", className: "tl-vis-loss-item"});
        });
      } else if (mode === "commanders") {
        data.commanders.filter(commander => T(commander.end) >= view.start && T(commander.start) < view.end).forEach((commander, index) => {
          const key = "command-" + commander.start;
          groups.push({id: key, content: "", commanderKey: key, order: index});
          // Full names live on a dedicated row label, so short tenures never truncate them.
          add({kind: "commander", key, title: commander.name, date: commander.text, value: commander}, {group: key, start: Math.max(view.start, T(commander.start)), end: Math.min(view.end, T(commander.end) + DAY), type: "range", className: "tl-vis-command-range"});
        });
      } else {
        groups.push({id: "moves", content: "Battalion movements<br><small>All companies</small>", order: 1});
        data.moves.filter(move => T(move.day) >= view.start && T(move.day) < view.end).forEach(move => {
          add({kind: "movement", key: "move-" + move.day, title: movementLabel(move), date: move.text, value: move}, Object.assign({group: "moves"}, labelledPoint(T(move.day), "tl-vis-move")));
        });
      }
      return {items, groups};
    }

    function rangeContent(item) {
      if (item.className !== "tl-vis-command-range") return content(item);
      const bar = el("span", "tl-vis-tenure");
      bar.setAttribute("aria-hidden", "true");
      return bar;
    }

    function groupContent(group) {
      if (!group.commanderKey) return el("div", "", group.content);
      const payload = payloads.get(group.commanderKey);
      const button = el("button", "tl-vis-command-label", "<strong>" + esc(payload.title) + '</strong><span class="tl-vis-command-date">' + esc(payload.date) + "</span>");
      button.type = "button";
      button.dataset.entryId = payload.key;
      button.setAttribute("aria-controls", "tl-detail");
      button.setAttribute("aria-expanded", String(selected === payload.key));
      if (selected === payload.key) button.classList.add("is-selected");
      button.onclick = event => { event.stopPropagation(); openDetail(button, payload, event); };
      return button;
    }

    function updateChart(current, host, items, groups, options) {
      if (!current) return new window.vis.Timeline(host, items, groups, options);
      current.setGroups(groups);
      current.setItems(items);
      current.setOptions(options);
      current.setWindow(view.start, view.end, {animation: false});
      return current;
    }

    function render(nextView) {
      closeDetail();
      view = nextView;
      const built = chartData();
      const history = mode === "history";
      const daily = history && (view.level === "month" || view.end - view.start <= 93 * DAY);
      const dates = daily ? [...new Set(data.kia.map(man => T(man.day)).filter(day => day >= view.start && day < view.end))].sort((a, b) => a - b) : [];
      const gap = dates.length > 1 ? Math.min(...dates.slice(1).map((day, index) => day - dates[index])) : Infinity;
      // Closely spaced dates get room to read on one row, with native sideways scrolling.
      root.style.minWidth = daily && Number.isFinite(gap) ? "max(52rem, calc(11rem + " + Math.ceil((view.end - view.start) / gap * 32 + 4) + "px))" : "";
      memorialRoot.hidden = !history;
      const options = {
        start: view.start, end: view.end, min: U(1965, 4), max: U(1969, 10),
        orientation: {axis: "top", item: "top"},
        stack: true, groupHeightMode: "auto", groupOrder: "order",
        moveable: false, zoomable: false, selectable: false, multiselect: false,
        showCurrentTime: false, showTooltips: false, editable: false,
        margin: {axis: 16, item: {horizontal: 18, vertical: 14}},
        moment: date => window.vis.moment(date).utc(),
        template: rangeContent,
        groupTemplate: groupContent,
        format: {minorLabels: {month: "MMM", year: "YYYY"}, majorLabels: {month: "YYYY", year: ""}},
        showMajorLabels: view.level !== "war"
      };
      timeline = updateChart(timeline, primaryRoot, built.items.filter(item => item.group !== "losses"), built.groups.filter(group => group.id !== "losses"), options);
      if (history) {
        // Casualty columns are a single aligned row; patrol labels retain collision avoidance.
        memorialTimeline = updateChart(memorialTimeline, memorialRoot, built.items.filter(item => item.group === "losses"), built.groups.filter(group => group.id === "losses"), Object.assign({}, options, {stack: false, showMinorLabels: false, showMajorLabels: false}));
      }
      root.setAttribute("role", "group");
      root.setAttribute("aria-label", mode === "history" ? "Patrols and killed in action on the same time scale" : mode === "commanders" ? "Company commanders and their command periods" : "Dated battalion movements");
      document.querySelector(".timeline-key").hidden = mode !== "history";
      document.querySelectorAll("[data-chart-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.chartView === mode)));
    }
    document.querySelectorAll("[data-chart-view]").forEach(button => {
      button.onclick = () => { mode = button.dataset.chartView; if (view) render(view); };
    });
    if (document.fonts) document.fonts.ready.then(() => {
      if (timeline) timeline.redraw();
      if (memorialTimeline) memorialTimeline.redraw();
    });
    return {render};
  };
})();
