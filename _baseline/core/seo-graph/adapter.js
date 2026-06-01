// Adapter to @jdevalk/seo-graph-core.
//
// Translates Baseline's cascade (settings, page-context, navigator nodes)
// into piece-builder inputs, then calls assembleGraph and returns the
// resolved @graph array for storage under data.seo.graph.

/**
 * @param {{
 *   settings: import('../types.js').BaselineSettings,
 *   pageContext: any,
 *   navigatorNode: any,
 *   seo: any
 * }} input
 * @returns {Array<unknown>}
 */
export function assembleSchemaGraph(/* input */) {
	// TODO: import { assembleGraph, buildWebSite, ... } from '@jdevalk/seo-graph-core'
	// TODO: translate inputs, call assembleGraph, return the @graph array.
	return [];
}
