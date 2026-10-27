/* 代码块一键复制
 * Material 社区版没有内置复制按钮（content.code.copy 是 Insiders 特性），
 * 这里用 Clipboard API 自行实现，并兼容 navigation.instant 的页面切换。
 */
(function () {
  // 语言显示名映射：代码块左上角的标签条用
  var LANG = {
    cpp: "C++", "c++": "C++", c: "C", csharp: "C#", cs: "C#",
    python: "Python", py: "Python",
    bash: "Shell", sh: "Shell", shell: "Shell", zsh: "Shell",
    js: "JavaScript", javascript: "JavaScript",
    ts: "TypeScript", typescript: "TypeScript",
    json: "JSON", yaml: "YAML", yml: "YAML",
    html: "HTML", xml: "XML", css: "CSS", scss: "SCSS",
    java: "Java", kotlin: "Kotlin", rust: "Rust", go: "Go",
    sql: "SQL", markdown: "Markdown", md: "Markdown",
    text: "Text", plaintext: "Text", plain: "Text"
  };

  function fallback(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    try { document.execCommand("copy"); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function attach() {
    var codes = document.querySelectorAll(".md-content pre > code");
    Array.prototype.forEach.call(codes, function (code) {
      var pre = code.parentElement;
      if (pre.dataset.oiCopy === "1") return;
      pre.dataset.oiCopy = "1";

      // 语言标签：Material 把 language-xxx 挂在 .highlight 容器上
      var holder = pre.parentElement;
      if (holder && !holder.dataset.lang) {
        var mm = ((holder.className || "") + " " + (pre.className || ""))
          .match(/language-([A-Za-z0-9+#-]+)/);
        if (mm) {
          var k = mm[1].toLowerCase();
          holder.dataset.lang = LANG[k] || mm[1];
        }
      }

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "oi-copy";
      btn.textContent = "复制";
      btn.setAttribute("aria-label", "复制代码");

      btn.addEventListener("click", function () {
        var text = code.innerText;
        function done() {
          btn.textContent = "已复制";
          btn.classList.add("oi-copy-ok");
          setTimeout(function () {
            btn.textContent = "复制";
            btn.classList.remove("oi-copy-ok");
          }, 1500);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () { fallback(text, done); });
        } else {
          fallback(text, done);
        }
      });

      pre.appendChild(btn);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(attach);
  }
})();
