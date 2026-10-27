/* 知识图谱渲染
 * · 数据外置到 assets/data/graph.json，vis-network 按需懒加载（仅含图谱的页面才下载 690KB）
 * · 支持 full（全屏页）与 preview（首页）两种模式
 * · 悬停聚焦：邻接节点提亮、其余淡出
 */
(function () {
  var SELF = (document.currentScript && document.currentScript.src) || "";
  var ASSETS = SELF ? new URL("..", SELF).href : "/assets/";
  var VIS_URL = ASSETS + "vis/vis-network.min.js";

  var visPromise = null;
  function loadVis() {
    if (window.vis && window.vis.Network) return Promise.resolve(window.vis);
    if (visPromise) return visPromise;
    visPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = VIS_URL;
      s.onload = function () { resolve(window.vis); };
      s.onerror = function () { reject(new Error("vis-network 加载失败")); };
      document.head.appendChild(s);
    });
    return visPromise;
  }

  // #rrggbb + 透明度 → rgba()
  function alpha(hex, a) {
    var h = (hex || "#94a3b8").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function build(container, G, mode) {
    var preview = mode === "preview";
    var base = G.nodes.map(function (n) {
      var showLabel = !preview || n.value >= 4;
      return {
        id: n.id,
        label: showLabel ? n.label : "",
        group: n.group,
        value: n.value,
        url: n.url,
        _raw: n,
        shape: "dot",
        borderWidth: 1.5,
        color: {
          background: alpha(n.color, 0.22),
          border: n.color,
          highlight: { background: n.color, border: "#ffffff" },
          hover: { background: alpha(n.color, 0.5), border: n.color }
        },
        font: {
          color: "#c9d6d0",
          size: preview ? 10 : 12,
          face: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          strokeWidth: 0
        }
      };
    });

    var nodes = new vis.DataSet(base);
    var edges = new vis.DataSet(G.edges.map(function (e, i) {
      return {
        id: i, from: e.from, to: e.to,
        color: { color: "rgba(160,180,175,.13)", highlight: "#3f9c78", hover: "rgba(63,156,120,.5)" },
        width: 1,
        arrows: { to: { enabled: true, scaleFactor: 0.35 } },
        smooth: { type: "continuous", roundness: 0.2 }
      };
    }));

    var network = new vis.Network(container, { nodes: nodes, edges: edges }, {
      autoResize: true,
      interaction: {
        hover: true, tooltipDelay: 200, hideEdgesOnDrag: true,
        navigationButtons: false, keyboard: false, multiselect: false
      },
      nodes: { scaling: { min: 5, max: preview ? 20 : 26 } },
      physics: {
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -46,
          centralGravity: 0.012,
          springLength: preview ? 90 : 120,
          springConstant: 0.09,
          damping: 0.55,
          avoidOverlap: 0.35
        },
        stabilization: { enabled: true, iterations: preview ? 220 : 400, fit: true },
        minVelocity: 0.6
      }
    });

    // 稳定后关掉物理，避免长期抖动
    network.once("stabilizationIterationsDone", function () {
      network.setOptions({ physics: false });
    });

    // 悬停聚焦
    var hoverTimer = null;
    function focus(nodeId) {
      var adj = new Set([nodeId]);
      edges.forEach(function (e) {
        if (e.from === nodeId) adj.add(e.to);
        if (e.to === nodeId) adj.add(e.from);
      });
      nodes.forEach(function (n) {
        var on = adj.has(n.id);
        nodes.update({
          id: n.id,
          borderWidth: on ? 2.5 : 1,
          color: {
            background: alpha(n._raw.color, on ? 0.72 : 0.06),
            border: on ? n._raw.color : alpha(n._raw.color, 0.25)
          },
          font: { color: on ? "#f0fdf6" : "rgba(200,215,208,.16)", size: on ? 13 : (preview ? 10 : 12) }
        });
      });
    }
    function unfocus() {
      nodes.update(base.map(function (n) { return { id: n.id, borderWidth: 1.5, color: n.color, font: n.font }; }));
    }

    network.on("hoverNode", function (p) {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { focus(p.node); }, 60);
    });
    network.on("blurNode", function () {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(unfocus, 120);
    });

    network.on("click", function (p) {
      if (!p.nodes.length) return;
      var n = nodes.get(p.nodes[0]);
      if (n && n.url) window.location.href = n.url;
    });

    return { network: network, nodes: nodes, edges: edges, base: base, focus: focus, unfocus: unfocus };
  }

  function initAll() {
    var boxes = document.querySelectorAll("#oi-graph");
    if (!boxes.length) return;

    Array.prototype.forEach.call(boxes, function (box) {
      if (box.dataset.oiInit === "1") return;
      box.dataset.oiInit = "1";

      var mode = box.dataset.mode || "full";
      var src = box.dataset.src || (ASSETS + "data/graph.json");

      box.innerHTML = '<div class="oi-graph-loading">正在构建图谱…</div>';

      Promise.all([loadVis(), fetch(src).then(function (r) { return r.json(); })])
        .then(function (res) {
          var G = res[1];
          box.innerHTML = "";
          var api = build(box, G, mode);
          box._oiApi = api;

          // 工具栏（仅 full 模式）
          if (mode !== "preview") {
            var q = document.getElementById("oi-graph-q");
            var f = document.getElementById("oi-graph-f");
            var r = document.getElementById("oi-graph-reset");

            if (q) {
              q.addEventListener("input", function () {
                var kw = this.value.trim().toLowerCase();
                api.nodes.forEach(function (n) {
                  var hit = !kw || n.label.toLowerCase().indexOf(kw) >= 0;
                  api.nodes.update({ id: n.id, hidden: !hit });
                });
              });
            }
            if (f) {
              f.addEventListener("change", function () {
                var g = this.value;
                api.nodes.forEach(function (n) {
                  api.nodes.update({ id: n.id, hidden: !!g && n.group !== g });
                });
              });
            }
            if (r) {
              r.addEventListener("click", function () {
                api.network.setOptions({ physics: true });
                api.network.stabilize(300);
                setTimeout(function () { api.network.setOptions({ physics: false }); }, 1200);
              });
            }
          }
        })
        .catch(function (e) {
          box.innerHTML = '<div class="oi-graph-error">图谱加载失败：' +
            (e && e.message ? e.message : "未知错误") +
            '<br>可直接访问 <a href="/00_%E7%B4%A2%E5%BC%95/00%20%E6%80%BB%E8%A7%88/">00 总览</a></div>';
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(function () { setTimeout(initAll, 40); });
  }
})();
