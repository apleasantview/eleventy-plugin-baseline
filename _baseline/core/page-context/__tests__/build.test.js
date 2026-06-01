import { describe, expect, it } from 'vitest';
import { createPageContext } from '../build.js';

// Drive the public builder and read the merged `head` it produces. These guard
// the dedupe regression: distinct tags must survive the settings + front-matter
// merge (links were keyed by href-only, metas by name-only, both lossy).
function buildHead({ settingsHead, pageHead } = {}) {
	const build = createPageContext({
		scope: { values: new Map() },
		slugIndex: null,
		settings: { url: 'https://www.example.com', head: settingsHead },
		runtime: {},
		options: {}
	});
	const context = build({
		page: { url: '/p/', fileSlug: 'p' },
		title: 'P',
		description: 'd',
		head: pageHead
	});
	return context.head;
}

describe('buildHead dedupe', () => {
	it('keeps links that share a host but differ in rel', () => {
		const head = buildHead({
			settingsHead: {
				link: [
					{ rel: 'preconnect', href: 'https://fonts.gstatic.com' },
					{ rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' }
				]
			}
		});
		expect(head.link).toHaveLength(2);
	});

	it('collapses metas sharing a property, last value winning', () => {
		const head = buildHead({
			settingsHead: { meta: [{ property: 'og:title', content: 'site' }] },
			pageHead: { meta: [{ property: 'og:title', content: 'page' }] }
		});
		expect(head.meta).toHaveLength(1);
		expect(head.meta[0].content).toBe('page');
	});

	it('still collapses a genuine duplicate, front matter winning over settings', () => {
		const head = buildHead({
			settingsHead: { meta: [{ name: 'description', content: 'site' }] },
			pageHead: { meta: [{ name: 'description', content: 'page' }] }
		});
		expect(head.meta).toHaveLength(1);
		expect(head.meta[0].content).toBe('page');
	});

	it('still collapses a genuinely duplicated link (same rel + href)', () => {
		const head = buildHead({
			settingsHead: {
				link: [
					{ rel: 'preconnect', href: 'https://fonts.gstatic.com' },
					{ rel: 'preconnect', href: 'https://fonts.gstatic.com' }
				]
			}
		});
		expect(head.link).toHaveLength(1);
	});
});
