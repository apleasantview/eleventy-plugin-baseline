// Sidecar for faq.md. A render-time hook: called from the template as
// {{ _hook('faq') }}, it reads the resolved faq collection off this.ctx, builds
// the FAQ Questions, and patches them onto the page's FAQPage node in the
// resolved seo graph (this.ctx._seoGraph.schema) in place, before head emits the
// JSON-LD at transform-time. The mutation rides the same object head reads from
// the registry by url (same-reference confirmed 2026-06-03). The assignment is
// idempotent: a rebuild replaces mainEntity, it never accumulates. Side-effect
// only; returns an empty string so the call prints nothing.
export const _hook = function () {
	const questions = (this.ctx.collections.faq ?? []).map((record) => ({
		'@type': 'Question',
		name: record.data.title,
		acceptedAnswer: {
			'@type': 'Answer',
			text: (record.data.answer ?? '').trim()
		}
	}));

	const schema = this.ctx._seoGraph?.schema;
	const faqNode = Array.isArray(schema) ? schema.find((node) => node['@type'] === 'FAQPage') : undefined;
	if (faqNode) faqNode.mainEntity = questions;

	return '';
};
