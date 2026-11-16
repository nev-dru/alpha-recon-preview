/* "Possible matches": clicking the name opens its list in place. Without this the name links to the full list page. */
(function () {
  "use strict";
  var open = null;

  function close() {
    if (!open) return;
    open.panel.hidden = true;
    open.control.setAttribute("aria-expanded", "false");
    open = null;
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll("a.possible[data-matches]"), function (control) {
      var panel = document.getElementById(control.getAttribute("data-matches"));
      if (!panel) return;
      control.setAttribute("role", "button");
      control.setAttribute("aria-expanded", "false");
      control.addEventListener("click", function (event) {
        event.preventDefault();
        if (open && open.control === control) { close(); return; }
        close();
        document.body.appendChild(panel);
        panel.hidden = false;
        var box = control.getBoundingClientRect();
        panel.style.left = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, box.left)) + window.scrollX + "px";
        panel.style.top = box.bottom + 6 + window.scrollY + "px";
        control.setAttribute("aria-expanded", "true");
        open = { control: control, panel: panel };
      });
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") close(); });
    document.addEventListener("click", function (event) {
      if (open && !open.panel.contains(event.target) && !event.target.closest("a.possible")) close();
    });
  });
})();
