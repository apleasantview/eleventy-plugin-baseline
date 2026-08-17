import Prism from 'prismjs';
import 'prismjs/plugins/toolbar/prism-toolbar';
import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard';
import 'prismjs/plugins/show-language/prism-show-language';

// Eleventy highlights every code block at build time, so the markup arrives
// already tokenised. Prism otherwise re-highlights on load, re-tokenising from
// textContent against whatever languages this bundle happens to import; any it
// does not know it overwrites with plain text. Opt out before DOMContentLoaded.
Prism.manual = true;

// The toolbar, the copy button and the language label all hang off the
// `complete` hook and read only `env.element` and `env.language`. Running the
// hook directly gets them attached without re-tokenising anything.
document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('pre > code[class*="language-"]').forEach((element) => {
		const match = element.className.match(/\blanguage-([\w-]+)\b/);

		Prism.hooks.run('complete', { element, language: match ? match[1] : undefined });
	});
});
