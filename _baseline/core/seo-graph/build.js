import { setEntry } from '../registry.js';

/**
 * SEO namespace builder factory.
 *
 * Returns `buildSeoNamespace(data)` which normalises the cascade into a
 * resolved `seo` object: canonical fields, OG/Twitter projections, and the
 * assembled JSON-LD graph under `schema.graph`.
 *
 * @param {{
 *   scope: { values: Map },
 *   settings: import('../types.js').BaselineSettings,
 *   runtime: any,
 *   options: import('../types.js').BaselineOptions,
 *   log?: { warn: (...args: unknown[]) => void }
 * }} deps
 */
export function createSeoNamespace({ scope, settings, runtime, options, log }) {
	return function buildSeoNamespace(data) {
		const seo = data.seo ?? {};

		// TODO: canonical, openGraph, twitter, schema.graph

		const inspectionKey = data.page?.url ?? data.page?.inputPath;
		if (inspectionKey) setEntry(scope, inspectionKey, seo);

		return seo;
	};
}
