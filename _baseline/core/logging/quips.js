/**
 * Logging quips (personality)
 *
 * A small set of one-liners used at the pre-pass boundary. The pre-pass
 * runs Eleventy inside Eleventy, so each line is a nod to that idea of
 * repetition or recursion. Picked at random per build.
 *
 * Architecture layer:
 *   runtime substrate (logging)
 *
 * Why this exists:
 *   Build logs are dry by default. A single playful line at a recurring
 *   moment makes the narrative feel like the project, not a config dump.
 */

const REPETITION_QUIPS = [
	'Somewhere, a bowl of petunias is thinking: oh no, not again.',
	'Déjà vu is usually a glitch in the Matrix.',
	'All of this has happened before, and all of it will happen again.',
	'Yo dawg, I heard you like Eleventy, so I put Eleventy in your Eleventy…'
];

/**
 * Return a random repetition quip.
 *
 * @returns {string}
 */
export function pickRepetitionQuip() {
	return REPETITION_QUIPS[Math.floor(Math.random() * REPETITION_QUIPS.length)];
}
