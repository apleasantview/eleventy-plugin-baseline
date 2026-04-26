import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import debug from './utils/debug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Navigator Core (Eleventy Module)
 *
 * This module exposes internal Eleventy render-time state for debugging
 * and inspection purposes.
 *
 * It is intentionally isolated from other baseline modules and does not
 * introduce runtime dependencies beyond Eleventy's config API.
 *
 * ------------------------------------------------------------
 *
 * Responsibilities
 * ------------------------------------------------------------
 * 1. Expose internal Nunjucks runtime context as globals
 * 2. Expose template render context for inspection
 * 3. Optionally register a virtual debug page
 * 4. Provide debugging filters for structured inspection output
 *
 * ------------------------------------------------------------
 *
 * Debug Surface
 * ------------------------------------------------------------
 * - _navigator → full Nunjucks runtime environment (env + ctx)
 * - _context   → raw template context (this.ctx)
 * - _debug     → runtime snapshots (contentMap, pageContext inspection map)
 *
 * These are strictly development tools and should not be relied on
 * for production rendering logic.
 *
 * Note: _debug.contentMap resolves to null on the virtual navigator
 * template because that template renders before `eleventy.contentMap`
 * fires. View _debug from any ordinary page for a populated contentMap.
 *
 * ------------------------------------------------------------
 *
 * Options
 * ------------------------------------------------------------
 * navigator:
 *   template: boolean | [boolean, number]
 *     Enables virtual debug page generation.
 *
 *   inspectorDepth: number
 *     Controls depth of inspected object output (default: 4)
 *
 * ------------------------------------------------------------
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * Eleventy configuration instance.
 *
 * @param {Object} moduleContext
 * Shared baseline module context.
 *
 * @param {Object} moduleContext.state
 * Resolved plugin state (settings + options).
 *
 * @param {Object} moduleContext.snapshots
 * Thunks returning current runtime state: { contentMap, pageContext }.
 */
export default function navigatorCore(eleventyConfig, moduleContext) {
	const { state, snapshots, log } = moduleContext;
	const { options } = state;
	const renderTemplate = options.navigator?.template ?? false;
	const inspectorDepth = options.navigator?.inspectorDepth ?? 4;

	eleventyConfig.addGlobalData('eleventyComputed._debug', () => {
		return () => ({
			contentMap: snapshots.contentMap(),
			pageContext: snapshots.pageContext()
		});
	});

	/**
	 * Nunjucks Global: _navigator
	 *
	 * Exposes internal Nunjucks runtime state:
	 * - env  → environment instance
	 * - ctx  → current render context
	 * - globals → registered global values
	 */
	eleventyConfig.addNunjucksGlobal('_navigator', function () {
		return {
			env: this.env,
			ctx: this.ctx,
			globals: this.env?.globals
		};
	});

	/**
	 * Nunjucks Global: _context
	 *
	 * Direct reference to the template execution context.
	 * Useful for debugging data shape at render time.
	 */
	eleventyConfig.addNunjucksGlobal('_context', function () {
		return this.ctx;
	});

	/**
	 * Virtual Debug Template
	 *
	 * Registers a synthetic Eleventy page that dumps runtime context.
	 * This is only enabled when explicitly configured via options.
	 */
	if (renderTemplate) {
		const templatePath = path.join(__dirname, './templates/navigator-core.html');
		const virtualTemplateContent = fs.readFileSync(templatePath, 'utf-8');

		eleventyConfig.addTemplate('navigator-core.html', virtualTemplateContent, {
			permalink: '/navigator-core.html',
			title: 'Navigator Core',
			description: 'Eleventy + Baseline internals',
			layout: null,
			eleventyExcludeFromCollections: true,
			_internal: false,

			// Debug control surface
			inspectorDepth
		});

		log.info('Navigator template registered at /navigator-core.html');
	}

	/**
	 * Debug Filters
	 *
	 * Lightweight helpers for inspecting values in templates.
	 * These are intentionally prefixed to avoid collisions.
	 */
	eleventyConfig.addFilter('_inspect', debug.inspect);
	eleventyConfig.addFilter('_json', debug.json);
	eleventyConfig.addFilter('_keys', debug.keys);
}
