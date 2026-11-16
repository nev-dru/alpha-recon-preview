/* Sorting for any table marked data-sortable, and the roster's filters. Tables are complete without this. */
(function () {
  "use strict";

  function cellKey(cell) {
    var text = cell.textContent.trim();
    var when = Date.parse(text);
    if (/^\d{1,2}[\/ -]/.test(text) && !isNaN(when)) return { n: when };
    if (/^\d+$/.test(text)) return { n: Number(text) };
    return { s: text.toLowerCase() };
  }

  function compare(a, b) {
    if (a.s === "" && b.s !== "") return 1; // blanks last
    if (b.s === "" && a.s !== "") return -1;
    if (a.n !== undefined && b.n !== undefined) return a.n - b.n;
    if (a.n !== undefined) return -1;
    if (b.n !== undefined) return 1;
    return a.s < b.s ? -1 : a.s > b.s ? 1 : 0;
  }

  function makeSortable(table) {
    var body = table.tBodies[0];
    if (!table.tHead || !body) return;
    Array.prototype.forEach.call(table.tHead.rows[0].cells, function (th, index) {
      if (!th.textContent.trim()) return;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sort";
      button.innerHTML = th.innerHTML;
      th.textContent = "";
      th.appendChild(button);
      button.addEventListener("click", function () {
        var down = th.getAttribute("aria-sort") === "ascending";
        Array.prototype.forEach.call(table.tHead.rows[0].cells, function (other) { other.removeAttribute("aria-sort"); });
        th.setAttribute("aria-sort", down ? "descending" : "ascending");
        var rows = Array.prototype.slice.call(body.rows);
        rows.sort(function (x, y) {
          var result = compare(cellKey(x.cells[index]), cellKey(y.cells[index]));
          var blank = !x.cells[index].textContent.trim() || !y.cells[index].textContent.trim();
          return blank ? result : down ? -result : result;
        });
        rows.forEach(function (row) { body.appendChild(row); });
      });
    });
  }

  function rosterTools(form) {
    var table = document.getElementById(form.getAttribute("data-table-tools"));
    if (!table) return;
    var rows = Array.prototype.slice.call(table.tBodies[0].rows);
    var name = form.querySelector('[data-filter="name"]');
    var year = form.querySelector('[data-filter="year"]');
    var buttons = Array.prototype.slice.call(form.querySelectorAll(".seg button"));
    var count = document.querySelector('[data-table-count="' + table.id + '"]');
    var empty = document.querySelector('[data-table-empty="' + table.id + '"]');
    var status = "";
    var clear = form.querySelector("[data-clear]");

    function apply() {
      var wanted = name.value.trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (row) {
        var who = (row.cells[0].textContent + " " + row.cells[1].textContent).toLowerCase();
        var ok = (!wanted || who.indexOf(wanted) !== -1) &&
          (!year.value || row.cells[3].textContent.indexOf(year.value) !== -1) &&
          (!status || (status === "associate" ? row.getAttribute("data-associate") === "yes" : row.getAttribute("data-status") === status));
        row.hidden = !ok;
        if (ok) shown += 1;
      });
      count.textContent = shown === rows.length ? "Alpha Company: " + shown + " names" : "Showing " + shown + " of " + rows.length + " names";
      empty.hidden = shown > 0;
      var filters = [wanted && "the name “" + name.value.trim() + "”", year.value && "the year " + year.value, status && "the status chosen"].filter(Boolean);
      empty.textContent = "No names match " + filters.join(" with ") + ". Try fewer letters, or show everyone again.";
      if (clear) clear.hidden = filters.length === 0;
      table.parentElement.hidden = shown === 0;
      remember();
    }

    // The address carries the filters, so a filtered roster can be bookmarked, shared and returned to.
    function remember() {
      var q = new URLSearchParams();
      if (name.value.trim()) q.set("name", name.value.trim());
      if (year.value) q.set("year", year.value);
      if (status) q.set("show", status);
      var text = q.toString();
      history.replaceState(null, "", location.pathname + (text ? "?" + text : "") + location.hash);
    }

    function recall() {
      var q = new URLSearchParams(location.search);
      name.value = q.get("name") || "";
      year.value = q.get("year") || "";
      status = q.get("show") || "";
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-status") === status)); });
    }

    name.addEventListener("input", apply);
    year.addEventListener("change", apply);
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        status = button.getAttribute("data-status");
        buttons.forEach(function (other) { other.setAttribute("aria-pressed", String(other === button)); });
        apply();
      });
    });
    form.addEventListener("submit", function (event) { event.preventDefault(); });
    if (clear) clear.addEventListener("click", function () {
      name.value = ""; year.value = ""; status = "";
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-status") === "")); });
      apply(); name.focus();
    });
    form.hidden = false;
    recall();
    apply();
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll("table[data-sortable], .prose table"), makeSortable);
    Array.prototype.forEach.call(document.querySelectorAll("[data-table-tools]"), rosterTools);
  });
})();

/* His plain tables: say so when one is wider than the page. The roster and the Wall carry their own line. */
(function () {
  "use strict";
  var tables = Array.prototype.filter.call(document.querySelectorAll(".prose table"), function (t) { return !t.closest(".table-wrap"); });
  if (!tables.length) return;
  function check() {
    tables.forEach(function (table) {
      var hint = table.previousElementSibling;
      var has = hint && hint.classList.contains("scroll-hint");
      var wide = table.scrollWidth > table.clientWidth + 1;
      if (wide && !has) {
        hint = document.createElement("p");
        hint.className = "scroll-hint shown";
        hint.textContent = "Scroll sideways for more columns.";
        table.parentNode.insertBefore(hint, table);
      } else if (has) {
        hint.hidden = !wide;
      }
    });
  }
  check();
  window.addEventListener("resize", check);
})();
