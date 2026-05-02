/**
 * Baseline shared typedefs.
 *
 * Extracted from the composition root so file-level headers stay scannable.
 * No runtime exports; this file exists for IDE and JSDoc tooling only.
 */

/**
 * @typedef {Object} BaselineSettings
 * Site identity and SEO configuration.
 *
 * @property {string} [title]
 * @property {string} [tagline]
 * @property {string} [url]
 * @property {boolean} [noindex]
 * @property {string} [defaultLanguage]
 * @property {Record<string, unknown>} [languages]
 * @property {Object} [head]
 */

/**
 * @typedef {Object} BaselineOptions
 * Runtime feature flags and behaviour configuration.
 *
 * User-facing input. Each module reads its own slice from `state.options.<module>`.
 *
 * @property {boolean} [verbose]
 * Enables structured debug logging across modules.
 *
 * @property {boolean} [multilingual]
 * Enables multilingual mode. Requires settings.defaultLanguage and
 * settings.languages; the multilang module bails with a log otherwise.
 *
 * @property {boolean} [sitemap]
 * Enables sitemap generation module (default: true).
 *
 * @property {boolean | { template?: boolean, inspectorDepth?: number }} [navigator]
 * Controls navigator tooling. Boolean shorthand activates the module and
 * the virtual debug page. Object form lets the page render flag and the
 * inspector depth be tuned independently. Defaults to true in dev mode.
 *
 * @property {{ titleSeparator?: string, showGenerator?: boolean }} [head]
 * Head module options.
 *
 * @property {{ esbuild?: { minify?: boolean, target?: string } }} [assets]
 * Assets module options. The esbuild slice is permissive: any esbuild
 * option is accepted; only `minify` and `target` are typed.
 */

/**
 * @typedef {Object} BaselineState
 * Fully resolved internal plugin state.
 *
 * @property {Object} settings
 * @property {Object} options
 */

/**
 * @typedef {Object} BaselineContext
 * Shared module boundary contract.
 *
 * This context is the only supported interface between:
 * - Eleventy configuration runtime
 * - baseline core
 * - feature modules
 *
 * @property {BaselineState} state
 * @property {Object} runtime
 * @property {Object} runtime.contentMap
 * @property {Object} runtime.site
 */

export {};
