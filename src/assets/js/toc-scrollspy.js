/**
 * Highlights the "On this page" entry for the section you are reading.
 *
 * Positions are read live rather than cached, so late-loading fonts and
 * details blocks opening mid-page need no invalidation.
 */

// Distance below the viewport top that counts as "you are here".
const LINE = 96;

export function tocScrollspy() {
	// HtmlBasePlugin absolutises these hrefs, so match on the hash, not on `#`.
	const links = [...document.querySelectorAll('.c-toc-list a[href*="#"]')];
	if (!links.length) return;

	const targets = links.map((a) => document.getElementById(decodeURIComponent(new URL(a.href).hash.slice(1))));

	let current = null;

	const update = () => {
		let active = -1;
		targets.forEach((el, i) => {
			if (el && el.getBoundingClientRect().top < LINE) active = i;
		});

		const next = active === -1 ? null : links[active];
		if (next === current) return;

		current?.removeAttribute('aria-current');
		next?.setAttribute('aria-current', 'location');
		current = next;
	};

	update();
	addEventListener('scroll', update, { passive: true });
}
