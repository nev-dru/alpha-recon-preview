/* A labelled time-scale chart with the complete dated records underneath. */
(function () {
  "use strict";
  const source = document.getElementById("timeline-data");
  if (!source) return;
  const DATA = JSON.parse(source.textContent);
  const U = (year, month) => Date.UTC(year, month, 1);
  const T = value => Date.parse(value);
  const DAY = 864e5;
  const WAR = [U(1965, 4), U(1969, 10)];
  const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const esc = value => String(value).replace(/[&<>\"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const el = (tag, cls, html) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  };
  const fmt = value => {
    const day = new Date(value);
    return day.getUTCDate() + " " + MON[day.getUTCMonth()] + " " + day.getUTCFullYear();
  };
  const monthName = key => MON[+key.slice(5, 7) - 1] + " " + key.slice(0, 4);
  const time = day => '<time datetime="' + esc(day) + '">' + fmt(T(day)) + "</time>";
  const link = (label, href) => '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + '</a><span class="vh"> (opens in a new tab)</span>';
  const list = document.getElementById("tl-list");
  const title = document.getElementById("tl-title");
  const commanderSelect = document.getElementById("tl-commander");
  const chart = window.AlphaTimelineChart(document.getElementById("tl-chart"), DATA);
  const byDay = {};
  DATA.kia.forEach(man => (byDay[man.day] = byDay[man.day] || []).push(man));
  let view = {level: "war", start: WAR[0], end: WAR[1]};

  DATA.commanders.forEach((commander, index) => {
    const option = el("option", "", esc(commander.name));
    option.value = String(index);
    commanderSelect.appendChild(option);
  });

  function setView(level, year, month) {
    if (level === "war") view = {level, start: WAR[0], end: WAR[1]};
    else if (level === "year") {
      if (year < 1965 || year > 1969) return;
      view = {level, y: year, start: Math.max(U(year, 0), WAR[0]), end: Math.min(U(year + 1, 0), WAR[1])};
    } else if (level === "range") {
      view = {level, who: year, start: Math.max(T(year.start), WAR[0]), end: Math.min(T(year.end) + DAY, WAR[1])};
    } else {
      if (month < 0 || month > 11 || U(year, month) < WAR[0] || U(year, month) >= WAR[1]) return;
      view = {level, y: year, m: month, start: U(year, month), end: U(year, month + 1)};
    }
    const tag = level === "year" ? "#" + year : level === "month" ? "#" + year + "-" + String(month + 1).padStart(2, "0") : level === "range" ? "#commander-" + DATA.commanders.indexOf(year) : "";
    history.replaceState(null, "", location.pathname + location.search + tag);
    render();
  }

  function sources(event) {
    return '<ul class="tl-sources"><li>' + link("Read the full account", event.href) + "</li>" + event.links.map(item => "<li>" + link(item.t, item.h) + "</li>").join("") + "</ul>";
  }

  function patrolRecord(event, headingTag = "h5") {
    const record = el("article", "tl-entry tl-patrol");
    record.appendChild(el(headingTag, "", link(event.name, event.href)));
    record.appendChild(el("p", "tl-when", "Patrols and losses · " + esc(event.text)));
    if (event.opening) record.appendChild(el("p", "", esc(event.opening)));
    record.appendChild(el("div", "", sources(event)));
    return record;
  }

  function movementRecord(movement) {
    const record = el("article", "tl-entry tl-movement", '<h5>Battalion movement <span class="tl-kind">All companies</span></h5>');
    record.appendChild(el("p", "", esc(movement.what)));
    record.appendChild(el("p", "tl-source", link("Order of battle", "3rdreconborderofbattle.html")));
    return record;
  }

  function commanderRecord(commander) {
    const record = el("article", "tl-entry tl-command-record");
    record.appendChild(el("h5", "", esc(commander.name)));
    record.appendChild(el("p", "tl-when", "Alpha Company commander · " + esc(commander.text)));
    record.appendChild(el("p", "tl-source", link("Company commanders", "commanders.html")));
    return record;
  }

  function memorialRecord(day, men) {
    const record = el("section", "tl-entry tl-stone");
    record.appendChild(el("h5", "", "Alpha Company, killed in action"));
    record.appendChild(el("p", "tl-memorial-date", time(day)));
    const names = el("ul", "tl-men");
    men.forEach(man => {
      const item = el("li");
      const square = el("i", "tl-square" + (man.outlined ? " outlined" : ""));
      square.setAttribute("aria-hidden", "true");
      item.appendChild(square);
      item.appendChild(el("div", "", '<p class="tl-man-name">' + (man.href ? link(man.name, man.href) : esc(man.name)) + (man.outlined ? '<span class="vh"> (killed in action after leaving Alpha Company for another unit)</span>' : "") + '</p><p class="tl-man-details">' + esc(man.home) + ". " + esc(man.wall) + "</p>"));
      names.appendChild(item);
    });
    record.appendChild(names);
    record.appendChild(el("p", "tl-source", link("Wall of Honor", "alphakia.html")));
    return record;
  }

  function renderChronology() {
    const inView = value => T(value) >= view.start && T(value) < view.end;
    const days = new Map();
    const continuing = [];
    const add = (day, record) => {
      if (!days.has(day)) days.set(day, []);
      days.get(day).push(record);
    };
    DATA.events.filter(event => T(event.end || event.day) >= view.start && T(event.day) < view.end).forEach(event => {
      if (T(event.day) < view.start) continuing.push(patrolRecord(event, "h4"));
      else add(event.day, patrolRecord(event));
    });
    DATA.moves.filter(movement => inView(movement.day)).forEach(movement => add(movement.day, movementRecord(movement)));
    DATA.commanders.filter(commander => inView(commander.start)).forEach(commander => add(commander.start, commanderRecord(commander)));
    Object.keys(byDay).filter(inView).forEach(day => add(day, memorialRecord(day, byDay[day])));
    const months = new Map();
    Array.from(days.keys()).sort().forEach(day => {
      const key = day.slice(0, 7);
      if (!months.has(key)) {
        const section = el("section", "tl-month");
        const heading = el("h3", "", monthName(key));
        heading.id = "tl-month-" + key;
        section.setAttribute("aria-labelledby", heading.id);
        section.appendChild(heading);
        const dates = el("ol", "tl-days");
        section.appendChild(dates);
        months.set(key, {section, dates});
      }
      const group = el("li", "tl-day");
      group.dataset.day = day;
      group.appendChild(el("h4", "tl-day-date", time(day)));
      const records = el("div", "tl-day-records");
      records.append(...days.get(day));
      group.appendChild(records);
      months.get(key).dates.appendChild(group);
    });
    list.replaceChildren();
    if (continuing.length) {
      const section = el("section", "tl-continuing-records", "<h3>Continuing into this period</h3>");
      section.append(...continuing);
      list.appendChild(section);
    }
    list.append(...Array.from(months.values()).map(month => month.section));
    if (!days.size && !continuing.length) list.appendChild(el("p", "tl-empty", "No entries are recorded for this period. Choose another month or year."));
    if (DATA.unplaced.length) list.appendChild(el("p", "tl-unplaced", "Not placed (date not complete): " + DATA.unplaced.map(esc).join("; ")));
  }

  function renderCommandContext() {
    const context = document.getElementById("tl-command-context");
    const commanders = DATA.commanders.filter(commander => T(commander.end) >= view.start && T(commander.start) < view.end);
    context.hidden = view.level === "war" || !commanders.length;
    context.replaceChildren();
    if (context.hidden) return;
    context.appendChild(el("h3", "", "In command during this period"));
    context.appendChild(el("ul", "", commanders.map(commander => "<li><strong>" + esc(commander.name) + "</strong><span>" + esc(commander.text) + "</span></li>").join("")));
    context.appendChild(el("p", "tl-source", link("Company commanders", "commanders.html")));
  }

  function render() {
    const active = document.activeElement;
    const activeMonth = active && active.dataset.month;
    title.textContent = view.level === "war" ? "May 1965 to October 1969" : view.level === "year" ? String(view.y) : view.level === "range" ? view.who.name + ": " + view.who.text : MON[view.m] + " " + view.y;
    document.querySelectorAll(".tl-years button").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.year === (view.level === "war" ? "all" : String(view.y))));
    });
    commanderSelect.value = view.level === "range" ? String(DATA.commanders.indexOf(view.who)) : "";
    const months = document.getElementById("tl-months");
    months.hidden = !["year", "month"].includes(view.level);
    months.replaceChildren();
    if (!months.hidden) MON.forEach((name, index) => {
      const button = el("button", "", name.slice(0, 3));
      button.type = "button";
      button.dataset.month = String(index);
      button.disabled = U(view.y, index) < WAR[0] || U(view.y, index) >= WAR[1];
      button.setAttribute("aria-label", name + " " + view.y);
      button.setAttribute("aria-pressed", String(view.level === "month" && view.m === index));
      button.onclick = () => setView("month", view.y, index);
      months.appendChild(button);
    });
    document.getElementById("tl-hint").textContent = "Compare dates on the time scale. Killed in action is grouped by " + (view.level === "war" ? "year; choose a year to see each month" : view.level === "month" || view.end - view.start <= 93 * DAY ? "day" : "month; choose a month to see exact dates") + ". Select a labelled entry for details without moving the page.";
    const prev = document.getElementById("tl-prev"), next = document.getElementById("tl-next"), out = document.getElementById("tl-out");
    const fixed = view.level === "war" || view.level === "range";
    prev.hidden = next.hidden = fixed;
    prev.disabled = view.start <= WAR[0];
    next.disabled = view.end >= WAR[1];
    out.hidden = view.level === "war";
    out.textContent = view.level === "month" ? "Back to " + view.y : "All years";
    out.onclick = () => view.level === "month" ? setView("year", view.y) : setView("war");
    const step = direction => {
      if (view.level === "year") setView("year", view.y + direction);
      else {
        const date = new Date(U(view.y, view.m + direction));
        setView("month", date.getUTCFullYear(), date.getUTCMonth());
      }
    };
    prev.onclick = () => step(-1);
    next.onclick = () => step(1);
    chart.render(view);
    renderCommandContext();
    renderChronology();
    // Replacing the month controls must not move keyboard focus or the page's scroll position.
    if (activeMonth != null && !months.hidden) {
      const replacement = months.querySelector('[data-month="' + activeMonth + '"]');
      if (replacement && !replacement.disabled) replacement.focus({preventScroll: true});
    }
  }

  document.querySelectorAll(".tl-years button").forEach(button => {
    button.onclick = () => setView(button.dataset.year === "all" ? "war" : "year", +button.dataset.year);
  });
  commanderSelect.onchange = () => {
    if (commanderSelect.value === "") setView("war");
    else setView("range", DATA.commanders[+commanderSelect.value]);
  };
  function fromAddress(first = false) {
    const asked = /^#(196[5-9])(?:-(0[1-9]|1[0-2]))?$/.exec(location.hash);
    const commander = /^#commander-(\d+)$/.exec(location.hash);
    if (asked && asked[2] && U(+asked[1], +asked[2] - 1) >= WAR[0] && U(+asked[1], +asked[2] - 1) < WAR[1]) setView("month", +asked[1], +asked[2] - 1);
    else if (asked) setView("year", +asked[1]);
    else if (commander && DATA.commanders[+commander[1]]) setView("range", DATA.commanders[+commander[1]]);
    else if (first && matchMedia("(max-width: 48rem)").matches) setView("year", 1965);
    else setView("war");
  }
  addEventListener("hashchange", () => {
    if (!location.hash || /^#(?:196[5-9](?:-(?:0[1-9]|1[0-2]))?|commander-\d+)$/.test(location.hash)) fromAddress();
  });
  document.getElementById("timeline").hidden = false;
  fromAddress(true);
  document.getElementById("timeline-plain").hidden = true;
})();
