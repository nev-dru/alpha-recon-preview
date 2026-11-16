/* Person cards: open at once on hover, keyboard focus or tap; Escape or leaving closes. Names work as links without this. */
(function () {
  "use strict";
  var open = null;

  function place(card, name) {
    var box = name.getBoundingClientRect();
    card.hidden = false;
    var width = card.offsetWidth, height = card.offsetHeight;
    var left = Math.max(8, Math.min(window.innerWidth - width - 8, box.left));
    var top = box.bottom + 6;
    if (top + height > window.innerHeight - 8 && box.top - height - 6 > 8) top = box.top - height - 6;
    var origin = card.offsetParent ? card.offsetParent.getBoundingClientRect() : { left: -window.scrollX, top: -window.scrollY };
    card.style.left = left - origin.left + "px";
    card.style.top = top - origin.top - 6 + "px";
  }

  function show(name) {
    var card = document.getElementById(name.getAttribute("data-card"));
    if (!card) return;
    if (open && open.name !== name) hide();
    place(card, name);
    name.setAttribute("aria-expanded", "true");
    open = { name: name, card: card };
  }

  function hide() {
    if (!open) return;
    open.card.hidden = true;
    open.name.setAttribute("aria-expanded", "false");
    open = null;
  }

  function leaving(event) {
    if (!open) return;
    var to = event.relatedTarget;
    if (to && (open.card.contains(to) || open.name.contains(to))) return;
    hide();
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-card]"), function (name) {
      name.setAttribute("aria-expanded", "false");
      name.setAttribute("aria-controls", name.getAttribute("data-card"));
      name.addEventListener("pointerenter", function (e) { if (e.pointerType !== "touch") show(name); });
      name.addEventListener("pointerleave", leaving);
      name.addEventListener("focus", function () { show(name); });
      name.addEventListener("blur", leaving);
      name.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); show(name); } });
      name.addEventListener("click", function (event) {
        event.preventDefault(); // with scripts the card replaces the jump to the table row
        if (open && open.name === name && event.detail !== 0 && name.getAttribute("data-tapped") === "yes") {
          name.removeAttribute("data-tapped");
          hide();
        } else {
          show(name);
          name.setAttribute("data-tapped", "yes");
        }
      });
      var card = document.getElementById(name.getAttribute("data-card"));
      if (card) { card.addEventListener("pointerleave", leaving); card.addEventListener("focusout", leaving); }
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") hide(); });
    Array.prototype.forEach.call(document.querySelectorAll(".card-close"), function (button) {
      button.addEventListener("click", function () { var name = open && open.name; hide(); if (name) name.removeAttribute("data-tapped"); });
    });
    document.addEventListener("click", function (event) {
      if (open && !open.card.contains(event.target) && !event.target.closest("[data-card]")) hide();
    });
  });
})();
