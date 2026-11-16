/* Phone menu: the section list and search open from one button. Without this script they are simply always shown. */
(function () {
"use strict";
const header = document.querySelector(".site-header"), button = header && header.querySelector(".menu-toggle");
if (!button) return;
header.classList.add("js");
button.addEventListener("click", function () {
  const open = header.classList.toggle("open");
  button.setAttribute("aria-expanded", String(open));
  button.textContent = open ? "Close" : "Menu";
});
})();
