/* 站点交互增强
 * 1 顶部阅读进度条
 * 2 首页终端打字机
 * 3 正文页字数 / 阅读时长标记
 */
(function () {

  /* ---------- 1 阅读进度 ---------- */
  var bar = null;

  function ensureBar() {
    if (bar && document.body.contains(bar)) return bar;
    bar = document.createElement("div");
    bar.id = "oi-progress";
    document.body.appendChild(bar);
    return bar;
  }

  function updateBar() {
    var b = ensureBar();
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
    requestAnimationFrame(function () { updateBar(); ticking = false; });
  }

  /* ---------- 2 终端打字机 ---------- */
  var PHRASES = [
    "cat 00_索引/00\\ 总览.md",
    "grep -r \"树形DP\" 01_讲义/",
    "ls 02_题解 | wc -l",
    "git log --oneline 算法笔记",
    ":(){ :|:& };:   # 不要执行"
  ];

  function startTyping() {
    var host = document.getElementById("oi-typing");
    if (!host || host.dataset.on === "1") return;
    host.dataset.on = "1";

    var pi = 0, ci = 0, deleting = false;

    function tick() {
      var p = PHRASES[pi];
      if (!deleting) {
        ci++;
        host.textContent = p.slice(0, ci);
        if (ci >= p.length) {
          deleting = true;
          return setTimeout(tick, 1900);
        }
        return setTimeout(tick, 55 + Math.random() * 45);
      }
      ci -= 2;
      host.textContent = p.slice(0, Math.max(0, ci));
      if (ci <= 0) {
        deleting = false;
        pi = (pi + 1) % PHRASES.length;
        return setTimeout(tick, 320);
      }
      setTimeout(tick, 22);
    }
    tick();
  }

  /* ---------- 3 字数与阅读时长 ---------- */
  function readingMeta() {
    var h1 = document.querySelector(".md-content .md-typeset h1");
    if (!h1 || h1.dataset.oiMeta === "1") return;
    var body = h1.parentElement;
    if (!body || body.querySelector(".oi-meta")) return;

    // 取正文纯文本，剔除目录与反向链接区
    var clone = body.cloneNode(true);
    Array.prototype.forEach.call(
      clone.querySelectorAll(".oi-backlinks, .md-nav, script, style"),
      function (n) { n.remove(); }
    );
    var text = (clone.textContent || "").replace(/\s+/g, "");
    var chars = text.length;
    if (chars < 120) return;

    var minutes = Math.max(1, Math.round(chars / 380));

    var meta = document.createElement("div");
    meta.className = "oi-meta";
    meta.innerHTML =
      "<span>" + chars.toLocaleString("en-US") + " 字</span>" +
      "<span>≈ " + minutes + " 分钟</span>" +
      "<span>已归档</span>";
    h1.dataset.oiMeta = "1";
    h1.parentElement.insertBefore(meta, h1.nextSibling);
  }

  /* ---------- 启动 ---------- */
  function boot() {
    updateBar();
    startTyping();
    readingMeta();
  }

  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(function () { setTimeout(boot, 60); });
  }
})();
