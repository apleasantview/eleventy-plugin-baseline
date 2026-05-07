import { parseHTML } from 'linkedom';
import { getScope, setEntry, getEntry } from './registry.js';
import { extractGraph } from './content-graph-extractors.js';

const SCOPE_NAME = 'core:content-graph';

/**
 * Compute a deterministic content graph for a page.
 *
 * Pure function:
 * - no shared state
 * - no mutation
 * - safe to re-run
 */
export function computeContentGraph(eleventyConfig) {
	const scope = getScope(eleventyConfig, SCOPE_NAME);

	return {
		set(page, content) {
			// Only run for final HTML output pages
			if (!page?.outputFileExtension || page.outputFileExtension !== 'html') return null;

			// Skip internal/system pages
			if (page._internal) return null;

			try {
				const { document } = parseHTML(content);
				const graph = extractGraph(document);
				setEntry(scope, page.url, graph);
				return graph;
			} catch {
				// Fail silently per spec recommendation
				return null;
			}
		},
		snapshot() {
			return Object.fromEntries(scope.values);
		}
	};
}
