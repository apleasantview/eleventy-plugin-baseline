import Prism from "prismjs";
import "prismjs/plugins/toolbar/prism-toolbar";
import "prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard";
import "prismjs/plugins/show-language/prism-show-language";

Prism.plugins.toolbar;

document.addEventListener("DOMContentLoaded", () => {
  Prism.highlightAll(); // triggers toolbar to render on each code block
});
