---js
// Front matter is JS so the render-time hook can live in this one file instead of
// a sidecar. Eleventy needs top-level declarations here, not an object literal.
const title = 'FAQ';
const slug = 'faq';
const description =
	'Common questions about Eleventy Baseline: lock-in, scope, production-readiness, tooling, SEO, and support.';
const date = '2026-06-02';
const permalink = '/faq/';
const layout = 'layouts/page.njk';
const lang = 'en';
const pageType = 'FAQPage';

// Render-time hook: called from the body as {{ _hook('faq') }}. It reads the
// resolved faq collection and the resolved seo graph off this.ctx, then patches
// the FAQPage node's mainEntity in place before head emits the JSON-LD at
// transform-time. Same-reference: this.ctx._seoGraph.schema is the object head
// reads from the registry by url, so the mutation rides through. Idempotent: a
// rebuild replaces mainEntity, never accumulates. Side-effect only, returns ''.
const _hook = function () {
	const schema = this.ctx._seoGraph?.schema;
	const faqNode = Array.isArray(schema)
		? schema.find((node) => node['@type'] === 'FAQPage')
		: undefined;
	if (faqNode) {
		faqNode.mainEntity = (this.ctx.collections.faq ?? []).map((record) => ({
			'@type': 'Question',
			name: record.data.title,
			acceptedAnswer: { '@type': 'Answer', text: (record.data.answer ?? '').trim() }
		}));
	}
	return '';
};
---

{%- for item in collections.faq %}

## {{ item.data.title }}

{{ item.content | safe }}

{%- endfor %}

{# render-time hook: enriches this page's FAQPage node with mainEntity (side-effect, prints nothing) #}
{{ _hook('faq') }}
