/* Results appear under a search box as you type: every match in a short list that scrolls, filled a few at a time.
   Used by the front page's search box and by the search box in the header of every page. */
(function () {
  "use strict";
  var BATCH = 12, VISIBLE = 4, WAIT = 180, MIN = 2;  // about five show at once; more are added as the list is scrolled
  var ORDER = ["Person", "Page", "Picture"];
  var root = new URL("../../", document.currentScript.src).href;  // the site's top folder, from any page depth
  var engine = null;

  function esc(text) {
    return String(text).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function load() {
    engine = engine || import(root + "pagefind/pagefind.js");
    return engine;
  }

  function kindOf(d) {
    var kind = (d.filters && d.filters.type && d.filters.type[0]) || "Page";
    return ORDER.indexOf(kind) < 0 ? "Page" : kind;
  }

  /* Every match, with the men first, then pages, then pictures; each kind keeps the search's own order.
     Only the order is worked out here. A result's title and words are fetched when it is about to be shown. */
  function ordered(pagefind, query) {
    function of(kind) { return pagefind.search(query, { filters: { type: kind } }).then(function (f) { return f.results; }); }
    return Promise.all([pagefind.search(query), of("Person"), of("Picture")]).then(function (found) {
      var taken = {};
      found[1].concat(found[2]).forEach(function (r) { taken[r.id] = true; });
      var rest = found[0].results.filter(function (r) { return !taken[r.id]; });
      return found[1].concat(rest, found[2]);
    });
  }

  function row(d) {
    return '<li><a href="' + d.url + '"><span class="kind">' + kindOf(d) + "</span><strong>" + esc(d.meta.title || d.url) +
      '</strong><span class="snip">' + d.excerpt + "</span></a></li>";
  }

  function attach(form, box, out) {
    var timer = 0, asked = 0, pending = [], busy = false;

    function clear() { out.innerHTML = ""; out.hidden = true; pending = []; }

    /* Add the next few results to the list; called again as the reader nears the end of it. */
    function more(mine) {
      if (busy || !pending.length) return;
      busy = true;
      Promise.all(pending.splice(0, BATCH).map(function (r) { return r.data(); })).then(function (items) {
        busy = false;
        if (mine !== asked) return;
        var list = out.querySelector("ul");
        if (list) list.insertAdjacentHTML("beforeend", items.map(row).join(""));
        if (!pending.length) out.querySelector(".live-more").hidden = false;
      }).catch(function () { busy = false; });
    }

    /* The new list replaces the old one in a single step, once its first rows are ready, so the panel never empties. */
    function show(query, results, mine) {
      if (!results.length) {
        out.innerHTML = '<p class="live-status">Nothing found for “' + esc(query) + "”. Try a last name or a place.</p>";
        out.hidden = false;
        pending = [];
        return;
      }
      var rest = results.slice();
      Promise.all(rest.splice(0, BATCH).map(function (r) { return r.data(); })).then(function (items) {
        if (mine !== asked) return;
        var count = results.length === 1 ? "1 result" : results.length + " results";
        var all = root + "search.html?q=" + encodeURIComponent(query);
        out.innerHTML = '<p class="live-status">' + count + (results.length > VISIBLE ? ". Scroll for more." : "") + "</p><ul>" +
          items.map(row).join("") + '</ul><p class="live-more"' + (rest.length ? " hidden" : "") + '><a href="' + all +
          '">See these results on a full page</a></p>';
        out.hidden = false;
        out.scrollTop = 0;
        pending = rest;
        busy = false;
      }).catch(function () { if (mine === asked) clear(); });
    }

    function run() {
      var query = box.value.trim();
      var mine = ++asked;
      if (query.length < MIN) { clear(); return; }
      load().then(function (pagefind) {
        return ordered(pagefind, query);
      }).then(function (results) {
        if (mine === asked) show(query, results, mine);
      }).catch(function () {
        if (mine === asked) clear();  // the Search button still works without live results
      });
    }

    var settle = 0;
    out.addEventListener("scroll", function () {
      out.classList.add("moving");  // rows passing under the pointer do not light up one after another
      clearTimeout(settle);
      settle = setTimeout(function () { out.classList.remove("moving"); }, 160);
      if (out.scrollTop + out.clientHeight > out.scrollHeight - 600) more(asked);
    });
    box.addEventListener("focus", load, { once: true });
    box.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(run, WAIT); });
    form.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !out.hidden) { e.preventDefault(); clear(); box.focus(); }
    });
    document.addEventListener("click", function (e) { if (!form.contains(e.target)) clear(); });
    form.addEventListener("focusout", function (e) { if (e.relatedTarget && !form.contains(e.relatedTarget)) clear(); });
  }

  var front = document.querySelector(".front-search");
  if (front) attach(front, document.getElementById("front-search"), document.getElementById("front-results"));

  var header = document.querySelector(".site-search");
  var headerBox = header && header.querySelector('input[type="search"]');
  if (headerBox && !document.getElementById("search-q")) {  // the search page shows its own results
    var panel = document.createElement("div");
    panel.className = "live-results in-header";
    panel.setAttribute("aria-live", "polite");
    panel.hidden = true;
    header.appendChild(panel);
    attach(header, headerBox, panel);
  }
})();
