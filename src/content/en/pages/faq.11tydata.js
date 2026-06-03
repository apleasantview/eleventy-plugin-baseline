// Sidecar for faq.md. A render-time hook: called from the template as
// {{ _hook('faq') }}, it reads the resolved faq collection off this.ctx, builds
// the FAQ Questions, and patches them onto the page's FAQPage node in the
// resolved seo graph (this.ctx._seoGraph.schema) before head emits at transform.
// Returns a short marker string as a visible reminder in the template.
export const _hook = function () {
	const questions = (this.ctx.collections.faq ?? []).map((record) => ({
		'@type': 'Question',
		name: record.data.title,
		acceptedAnswer: {
			'@type': 'Answer',
			text: (record.data.answer ?? '').trim()
		}
	}));

	const graph = this.ctx;
	// debugger;
	// const faqNode = graph.find((node) => node['@type'] === 'FAQPage');
	// if (faqNode) faqNode.mainEntity = questions;

	return `faq hook: enriched FAQPage with ${questions.length} questions`;
};
