import Prism from "prismjs";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-markdown";
import "prismjs/plugins/toolbar/prism-toolbar";
import "prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard";
import "prismjs/plugins/show-language/prism-show-language";

Prism.languages.nunjucks = {
	'comment': /^\{#[\s\S]*?#\}$/,

	'tag-name': {
		pattern: /(^\{%-?\s*)\w+/,
		lookbehind: true,
		alias: 'keyword'
	},
	'delimiter': {
		pattern: /^\{[{%]-?|-?[%}]\}$/,
		alias: 'punctuation'
	},

	'string': {
		pattern: /("|')(?:\\.|(?!\1)[^\\\r\n])*\1/,
		inside: {
			'punctuation': /^['"]|['"]$/
		}
	},
	'keyword': /\b(?:even|if|odd)\b/,
	'boolean': /\b(?:false|null|true)\b/,
	'number': /\b0x[\dA-Fa-f]+|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee][-+]?\d+)?/,
	'operator': [
		{
			pattern: /(\s)(?:and|b-and|b-or|b-xor|ends with|in|is|matches|not|or|same as|starts with)(?=\s)/,
			lookbehind: true
		},
		/[=<>]=?|!=|\*\*?|\/\/?|\?:?|[-+~%|]/
	],
	'punctuation': /[()\[\]{}:.,]/
};

Prism.hooks.add('before-tokenize', function (env) {
	if (env.language !== 'nunjucks') {
		return;
	}

	var pattern = /\{(?:#[\s\S]*?#|%[\s\S]*?%|\{[\s\S]*?\})\}/g;
	Prism.languages['markup-templating'].buildPlaceholders(env, 'nunjucks', pattern);
});

Prism.hooks.add('after-tokenize', function (env) {
	Prism.languages['markup-templating'].tokenizePlaceholders(env, 'nunjucks');
});

document.addEventListener("DOMContentLoaded", () => {
	Prism.highlightAll(); // triggers toolbar (and buttons) on each code block
});
