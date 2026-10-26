/* KaTeX 客户端渲染
 * 关键：只注册 \( \) 与 \[ \]，绝不注册 $ / $$。
 * $ 已在构建期被 pymdownx.arithmatex 消费；再注册会误伤残留的 \$ 与位运算。
 */
(function () {
  function renderMath(root) {
    if (typeof renderMathInElement !== "function") return;
    renderMathInElement(root || document.body, {
      delimiters: [
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false,   // 单条公式写错只标红，不炸整页
      strict: false,         // 不因 \text 里的中文或未知命令中断
      trust: false,
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"]
    });
  }

  // 首屏
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { renderMath(document.body); });
  } else {
    renderMath(document.body);
  }

  // navigation.instant 跳转后必须重渲染，否则新页公式不显示
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(function () { renderMath(document.body); });
  }
})();
