/* 访问计数
 * 用 abacus.jasoncameron.dev 的免费计数 API（无需注册）。
 * · 站点总访问量写入页脚
 * · 当前页阅读量写入正文标题下的标记条
 * · 4 秒超时；失败则什么都不显示，不影响页面
 */
(function () {
  var NS = "lvwangshuOI";
  var API = "https://abacus.jasoncameron.dev";
  var counted = {};          // 已计数的路径，避免 instant 导航重复请求

  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function hit(key) {
    var url = API + "/hit/" + NS + "/" + key;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 4000) : null;
    return fetch(url, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (timer) clearTimeout(timer); return d && typeof d.value === "number" ? d.value : null; })
      .catch(function () { if (timer) clearTimeout(timer); return null; });
  }

  function putFooter(n) {
    if (n === null) return;
    var host = document.querySelector(".md-copyright");
    if (!host || host.querySelector(".oi-views-site")) return;
    var s = document.createElement("span");
    s.className = "oi-views-site";
    s.textContent = "· 本站访问 " + n.toLocaleString("en-US") + " 次";
    host.appendChild(s);
  }

  function putPage(n) {
    if (n === null) return;
    var meta = document.querySelector(".oi-meta");
    if (!meta || meta.querySelector(".oi-views-page")) return;
    var s = document.createElement("span");
    s.className = "oi-views-page";
    s.textContent = n.toLocaleString("en-US") + " 次阅读";
    meta.appendChild(s);
  }

  function run() {
    var path = location.pathname;
    if (counted[path]) return;
    counted[path] = true;

    // 站点总量：每次页面浏览 +1
    hit("site").then(putFooter);

    // 单页阅读量：只对内容页统计，首页/图谱/标签页跳过
    if (/^\/(00_|01_|02_|03_|04_)/.test(decodeURIComponent(path))) {
      hit("p-" + hash(path)).then(putPage);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(function () { setTimeout(run, 120); });
  }
})();
