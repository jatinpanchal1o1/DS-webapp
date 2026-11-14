
/*
 * DropPilot Prettify
 * Lightweight, dependency-free syntax highlighter.
 * Supports JavaScript, JSON, HTML/XML, and CSS.
 *
 * Usage:
 * <pre class="prettyprint">
 *   <code class="language-js">const x = 1;</code>
 * </pre>
 *
 * Include:
 * <script src="/Jquery/prettify.js" defer></script>
 */
(function (window, document) {
  'use strict';

  if (window.DropPilotPrettify) return;

  var KEYWORDS = /\b(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield|public|private|protected|interface|type|enum|implements|package|abstract|readonly|keyof|unknown|never)\b/;

  var BUILT_INS = /\b(?:Array|Date|Error|JSON|Map|Math|Number|Object|Promise|RegExp|Set|String|Symbol|console|document|fetch|localStorage|location|navigator|process|require|window)\b/;

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, function (ch) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[ch];
    });
  }

  function span(kind, value) {
    return '<span class="dp-' + kind + '">' +
      escapeHtml(value) + '</span>';
  }

  function highlight(source, language) {
    var tokens = [];

    var pattern = /(\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|<\/?[A-Za-z][^<>]*>|\b[A-Za-z_$][\w$]*\b)/g;

    var last = 0;
    var match;

    while ((match = pattern.exec(source))) {
      if (match.index > last) {
        tokens.push(escapeHtml(source.slice(last, match.index)));
      }

      var value = match[0];
      var kind = 'plain';

      if (/^(\/\*|\/\/|<!--|#)/.test(value)) {
        kind = 'comment';
      } else if (/^("|'|`)/.test(value)) {
        kind = 'string';
      } else if (/^(?:0[xX][\da-fA-F]+|\d)/.test(value)) {
        kind = 'number';
      } else if (/^<\/?[A-Za-z]/.test(value)) {
        kind = 'tag';
      } else if (
        language === 'css' &&
        /^(?:color|background|display|position|margin|padding|border|width|height|font|flex|grid|transform|transition|opacity|content|align-items|justify-content)$/.test(value)
      ) {
        kind = 'property';
      } else if (KEYWORDS.test(value)) {
        kind = 'keyword';
        KEYWORDS.lastIndex = 0;
      } else {
        KEYWORDS.lastIndex = 0;

        if (BUILT_INS.test(value)) {
          kind = 'builtin';
        }

        BUILT_INS.lastIndex = 0;
      }

      tokens.push(
        kind === 'plain'
          ? escapeHtml(value)
          : span(kind, value)
      );

      last = pattern.lastIndex;
    }

    if (last < source.length) {
      tokens.push(escapeHtml(source.slice(last)));
    }

    return tokens.join('');
  }

  function detectLanguage(element) {
    var className =
      (element.className || '') +
      ' ' +
      ((element.parentElement && element.parentElement.className) || '');

    var match = className.match(/(?:language-|lang-)([a-z0-9+#-]+)/i);

    if (match) {
      return match[1].toLowerCase();
    }

    var type = element.getAttribute('data-language');

    return (type || 'javascript').toLowerCase();
  }

  function addStyles() {
    if (document.getElementById('droppilot-prettify-styles')) {
      return;
    }

    var style = document.createElement('style');

    style.id = 'droppilot-prettify-styles';

    style.textContent = [
      '.prettyprint,.dp-code{display:block;overflow:auto;padding:18px 20px;margin:16px 0;border:1px solid #263247;border-radius:12px;background:#0b1220;color:#e5edf8;font:13px/1.7 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;tab-size:2;-moz-tab-size:2}',
      '.prettyprint code,.dp-code code{font:inherit;white-space:pre}',
      '.dp-comment{color:#8291a8;font-style:italic}',
      '.dp-string{color:#a5d6a7}',
      '.dp-number{color:#f6c177}',
      '.dp-keyword{color:#c792ea;font-weight:600}',
      '.dp-builtin{color:#82aaff}',
      '.dp-tag{color:#f78c6c}',
      '.dp-property{color:#80cbc4}',
      '.dp-line{display:block;min-height:1em}',
      '@media(prefers-reduced-motion:no-preference){.prettyprint,.dp-code{scroll-behavior:smooth}}'
    ].join('\n');

    document.head.appendChild(style);
  }

  function prettyPrint(root) {
    root = root || document;

    addStyles();

    var nodes = root.querySelectorAll(
      'pre.prettyprint, pre.dp-code, pre code.prettyprint, pre code.dp-code'
    );

    Array.prototype.forEach.call(nodes, function (node) {
      if (node.getAttribute('data-dp-highlighted') === 'true') {
        return;
      }

      var code =
        node.tagName.toLowerCase() === 'code'
          ? node
          : (node.querySelector('code') || node);

      var language = detectLanguage(code);
      var source = code.textContent || '';

      code.innerHTML = highlight(source, language);

      code.setAttribute('data-dp-highlighted', 'true');

      if (node.tagName.toLowerCase() === 'pre') {
        node.classList.add('dp-code');
      }
    });
  }

  window.DropPilotPrettify = {
    prettyPrint: prettyPrint,
    highlight: highlight
  };

  window.prettyPrint = prettyPrint;

  window.PR = window.PR || {};
  window.PR.prettyPrint = prettyPrint;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      prettyPrint();
    });
  } else {
    prettyPrint();
  }

})(window, document);
