/* 命令面板（Ctrl/Cmd + K）
 * 全站页面快速跳转：输入关键词即时筛选，↑↓ 选择，Enter 跳转，Esc 关闭。
 */
(function () {
  var SELF = (document.currentScript && document.currentScript.src) || "";
  var ASSETS = SELF ? new URL("..", SELF).href : "/assets/";
  var DATA_URL = ASSETS + "data/pages.json";

  var data = null, loading = false;
  var overlay = null, input = null, list = null, empty = null;
  var results = [], active = 0;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function ensureDom() {
    if (overlay) return;
    overlay = el("div", "oi-cmd");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<div class="oi-cmd-panel">' +
        '<div class="oi-cmd-head">' +
          '<span class="oi-cmd-prompt">›</span>' +
          '<input class="oi-cmd-input" type="text" placeholder="搜索笔记、题解、索引…" autocomplete="off" spellcheck="false">' +
          '<kbd class="oi-cmd-esc">Esc</kbd>' +
        '</div>' +
        '<div class="oi-cmd-list"></div>' +
        '<div class="oi-cmd-foot">' +
          '<span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>' +
          '<span><kbd>Enter</kbd> 打开</span>' +
          '<span class="oi-cmd-count"></span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    input = overlay.querySelector(".oi-cmd-input");
    list = overlay.querySelector(".oi-cmd-list");
    empty = overlay.querySelector(".oi-cmd-count");

    input.addEventListener("input", function () { render(this.value); });
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();
    });
  }

  function load() {
    if (data || loading) return Promise.resolve(data || []);
    loading = true;
    return fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (d) { data = d; loading = false; return d; })
      .catch(function () { loading = false; data = []; return []; });
  }

  // 打分：前缀命中 > 包含 > 子序列
  function score(item, q) {
    var t = item.t.toLowerCase();
    if (t.indexOf(q) === 0) return 100 - t.length * 0.01;
    if (t.indexOf(q) > 0) return 70 - t.indexOf(q) * 0.1;
    for (var i = 0; i < item.g.length; i++) {
      if (item.g[i].toLowerCase().indexOf(q) >= 0) return 45;
    }
    if (item.y && item.y.toLowerCase().indexOf(q) >= 0) return 30;
    // 子序列
    var j = 0;
    for (var k = 0; k < t.length && j < q.length; k++) if (t[k] === q[j]) j++;
    return j === q.length ? 15 : -1;
  }

  function render(q) {
    q = (q || "").trim().toLowerCase();
    var items = data || [];
    if (!q) {
      results = items.slice(0, 14);
    } else {
      results = items
        .map(function (it) { return { it: it, s: score(it, q) }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 14)
        .map(function (x) { return x.it; });
    }
    active = 0;
    draw();
  }

  function draw() {
    list.innerHTML = "";
    if (!results.length) {
      list.appendChild(el("div", "oi-cmd-none", "没有匹配结果"));
      empty.textContent = "";
      return;
    }
    results.forEach(function (it, i) {
      var row = el("a", "oi-cmd-item" + (i === active ? " is-active" : ""));
      row.href = it.p;
      row.innerHTML =
        '<span class="oi-cmd-type">' + (it.y || "笔记") + "</span>" +
        '<span class="oi-cmd-title">' + escapeHtml(it.t) + "</span>" +
        '<span class="oi-cmd-tags">' + it.g.map(escapeHtml).join(" · ") + "</span>";
      row.addEventListener("mouseenter", function () {
        active = i;
        Array.prototype.forEach.call(list.children, function (c, j) {
          c.classList.toggle("is-active", j === i);
        });
      });
      list.appendChild(row);
    });
    empty.textContent = results.length + " 项";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function move(d) {
    if (!results.length) return;
    active = (active + d + results.length) % results.length;
    Array.prototype.forEach.call(list.children, function (c, j) {
      c.classList.toggle("is-active", j === active);
    });
    var node = list.children[active];
    if (node && node.scrollIntoView) node.scrollIntoView({ block: "nearest" });
  }

  function open() {
    ensureDom();
    overlay.classList.add("is-open");
    document.documentElement.style.overflow = "hidden";
    input.value = "";
    input.focus();
    render("");
    load().then(function () { render(input.value); });
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.documentElement.style.overflow = "";
  }

  function isOpen() {
    return overlay && overlay.classList.contains("is-open");
  }

  document.addEventListener("keydown", function (e) {
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      isOpen() ? close() : open();
      return;
    }
    if (e.key === "Escape" && isOpen()) { e.preventDefault(); close(); return; }
    if (!isOpen()) {
      // "/" 聚焦站内搜索
      if (e.key === "/" && !/input|textarea|select/i.test((e.target.tagName || ""))) {
        var s = document.querySelector(".md-search__input");
        if (s) { e.preventDefault(); s.focus(); }
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") {
      var target = results[active];
      if (target) { e.preventDefault(); window.location.href = target.p; }
    }
  });

  // 左下角入口按钮
  function mount() {
    if (document.querySelector(".oi-cmd-btn")) return;
    var b = el("button", "oi-cmd-btn");
    b.type = "button";
    b.innerHTML = '<kbd>Ctrl</kbd><kbd>K</kbd>';
    b.setAttribute("aria-label", "打开命令面板");
    b.addEventListener("click", function () { isOpen() ? close() : open(); });
    document.body.appendChild(b);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(function () { setTimeout(mount, 40); });
  }
})();
