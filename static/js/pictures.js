/* Picture pages: the left and right arrow keys go to the previous and next picture. The buttons work without this. */
(function () {
"use strict";
document.addEventListener("keydown", function (event) {
  if (event.altKey || event.ctrlKey || event.metaKey || /input|select|textarea/i.test(event.target.tagName)) return;
  var rel = event.key === "ArrowLeft" ? "prev" : event.key === "ArrowRight" ? "next" : "";
  var link = rel && document.querySelector('.picture-nav a[rel="' + rel + '"]');
  if (link) location.href = link.href;
});
})();

/* Picture pages: make the picture larger or smaller, or put it back. Without this script it is simply shown large. */
(function () {
"use strict";
var img = document.querySelector(".picture-page figure img");
if (!img) return;
var box = img.parentNode, real = Number(img.getAttribute("width")) || img.naturalWidth || 1;
var bar = document.createElement("div"), status = document.createElement("span");
bar.className = "zoom-bar";
status.className = "count";
status.setAttribute("aria-live", "polite");
box.classList.add("zoom-box");

function shown() { return img.getBoundingClientRect().width; }
function report() { status.textContent = Math.round(shown() / real * 100) + "% of its real size"; }
function set(width) {
  img.style.maxWidth = "none";
  img.style.width = Math.round(Math.max(120, Math.min(real * 4, width))) + "px";
  report();
}
function reset() { img.style.width = img.style.maxWidth = ""; box.scrollTo(0, 0); report(); }
function button(label, act) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = "button secondary";
  b.textContent = label;
  b.addEventListener("click", act);
  bar.appendChild(b);
}
button("Zoom in", function () { set(shown() * 1.4); });
button("Zoom out", function () { set(shown() / 1.4); });
button("Reset", reset);
bar.appendChild(status);
box.parentNode.insertBefore(bar, box);
var copy = document.querySelector(".picture-page .enhanced-copy a");
if (copy) {
  var original = img.getAttribute("src"), enhanced = copy.getAttribute("href"), note = document.createElement("p");
  copy.parentNode.hidden = true;
  note.className = "zoom-note";
  note.hidden = true;
  note.textContent = "Contrast and sharpness adjusted by software. Nothing is added to the picture.";
  box.parentNode.insertBefore(note, box);
  button("Enhance", function (event) {
    var on = img.getAttribute("src") === original;
    img.src = on ? enhanced : original;
    event.currentTarget.textContent = on ? "Show original" : "Enhance";
    note.hidden = !on;
  });
  bar.appendChild(status);
}
box.addEventListener("click", function (event) { event.preventDefault(); set(shown() * 1.4); });
document.addEventListener("keydown", function (event) {
  if (event.altKey || event.ctrlKey || event.metaKey || /input|select|textarea/i.test(event.target.tagName)) return;
  if (event.key === "+" || event.key === "=") set(shown() * 1.4);
  else if (event.key === "-") set(shown() / 1.4);
  else if (event.key === "0") reset();
});
window.addEventListener("resize", report);
report();
})();
