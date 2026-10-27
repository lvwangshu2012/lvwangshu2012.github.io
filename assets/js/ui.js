/* 阅读进度条
 * 兼容 navigation.instant：切页后文档高度变化，需要重新计算。
 */
(function () {
  var bar = null;

  function ensure() {
    if (bar && document.body.contains(bar)) return bar;
    bar = document.createElement("div");
    bar.id = "oi-progress";
    document.body.appendChild(bar);
    return bar;
  }

  function update() {
    var b = ensure();
    var doc = document.documentElement;
    var y = window.pageYOffset || doc.scrollTop || 0;
    var max = doc.scrollHeight - doc.clientHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    b.style.transform = "scaleX(" + p + ")";
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      update();
      ticking = false;
    });
  }

  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(function () { setTimeout(update, 30); });
  } else {
    document.addEventListener("DOMContentLoaded", update);
  }
  update();
})();
