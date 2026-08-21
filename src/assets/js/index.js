import { themeSwitcher } from './theme-switcher';

themeSwitcher();

document.addEventListener('DOMContentLoaded', () => {
	console.log(`Howdy!`);
});

document.querySelectorAll('.c-docs-toc__item').forEach((item) => {
	const button = item.querySelector('.c-docs-toc__menu__caret');
	// const row = item.querySelector('.c-docs-toc__row');
	const children = item.nextElementSibling;

	if (!button || !children) return;

	// ensure initial state
	children.hidden = true;
	button.setAttribute('aria-expanded', 'false');

	// TOGGLE BEHAVIOR
	button.addEventListener('click', (e) => {
		e.preventDefault();

		const expanded = button.getAttribute('aria-expanded') === 'true';

		button.setAttribute('aria-expanded', String(!expanded));
		children.hidden = expanded;
	});

	// OPTIONAL: clicking the row label does NOT toggle (only button does)
});

// AUTO-OPEN ACTIVE SECTION
document.querySelectorAll('.c-docs-toc__item').forEach((item) => {
	if (item.classList.contains('active')) {
		const button = item.querySelector('.c-docs-toc__menu__caret');
		const children = item.nextElementSibling;

		if (button && children) {
			button.setAttribute('aria-expanded', 'true');
			children.hidden = false;
		}
	}
});
