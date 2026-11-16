/* Search page: results grouped as people, pages and pictures. The index is in pagefind/, built with the site. */
(function () {
  "use strict";
  var box = document.getElementById("search-q");
  var section = document.getElementById("search-section");
  var status = document.getElementById("search-status");
  var results = document.getElementById("search-results");
  if (!box || !results) return;

  var GROUPS = [["Person", "People"], ["Page", "Pages"], ["Picture", "Pictures"]];
  var query = new URLSearchParams(location.search).get("q") || "";
  box.value = query;
  var header = document.querySelector('header input[type="search"]');
  if (header) header.value = query;

  function esc(text) {
    return String(text).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function item(data, kind) {
    var title = esc(data.meta.title || data.url);
    if (kind === "Picture" && data.meta.image) {
      var src = new URL(data.meta.image, new URL(data.url, location.href)).href;
      return '<a class="result-picture" href="' + data.url + '"><img src="' + src + '" alt="" loading="lazy"><span>' + title + "</span></a>";
    }
    return '<li><a href="' + data.url + '"><strong>' + title + '</strong></a><span class="snip">' + data.excerpt + "</span></li>";
  }

  function show(groups, total) {
    if (!total) {
      status.textContent = "";
      results.innerHTML = '<p class="table-empty">Nothing found for “' + esc(query) + "”. Try a last name or a place.</p>";
      return;
    }
    status.textContent = total + (total === 1 ? " result" : " results") + " for “" + query + "”";
    results.innerHTML = GROUPS.map(function (g) {
      var found = groups[g[0]] || [];
      if (!found.length) return "";
      var body = g[0] === "Picture"
        ? '<div class="gallery">' + found.map(function (d) { return item(d, g[0]); }).join("") + "</div>"
        : '<ul class="mention-list">' + found.map(function (d) { return item(d, g[0]); }).join("") + "</ul>";
      return "<section><h2>" + g[1] + " <small>(" + found.length + ")</small></h2>" + body + "</section>";
    }).join("");
  }

  function run() {
    if (!query.trim()) { status.textContent = "Type a name, a place or a date above."; return; }
    status.textContent = "Searching…";
    import(new URL("pagefind/pagefind.js", location.href).href).then(function (pagefind) {
      var filters = section.value ? { section: section.value } : {};
      return pagefind.search(query, { filters: filters }).then(function (found) {
        return Promise.all(found.results.slice(0, 120).map(function (r) { return r.data(); }));
      });
    }).then(function (all) {
      var groups = {};
      all.forEach(function (data) {
        var kind = (data.filters && data.filters.type && data.filters.type[0]) || "Page";
        (groups[kind] = groups[kind] || []).push(data);
      });
      show(groups, all.length);
    }).catch(function () {
      status.textContent = "";
      results.innerHTML = '<p class="table-empty">Search could not load. Reload the page to try again.</p>';
    });
  }

  section.addEventListener("change", run);
  run();
})();
