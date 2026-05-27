// OG and Twitter projections.
//
// Reads canonical seo fields plus per-page identity, returns the two
// projections that head emits as <meta> tags. Rules inspired by Joost's
// buildSeoContext but written fresh against Baseline's namespace.

/**
 * @param {{ seo: any, pageContext: any, settings: any }} input
 * @returns {{ openGraph: Record<string, unknown>, twitter: Record<string, unknown> }}
 */
export function buildSocialProjections(/* input */) {
	// TODO: og:url fallback, twitter duplicate suppression, og:locale:alternate
	// derivation, image dimensions/alt gating, article:* gating, author chain.
	return {
		openGraph: {},
		twitter: {}
	};
}
