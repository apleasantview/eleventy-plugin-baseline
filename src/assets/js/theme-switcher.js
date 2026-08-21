export function themeSwitcher() {
	var root = document.documentElement;

	/* The base of an theme is an absence rather than a value: following the
	 * system means holding no opinion, so it removes the attribute instead of
	 * setting one. */
	var themes = [{ name: 'theme', base: 'system', values: ['system', 'light', 'dark'] }];

	function current(theme) {
		return localStorage.getItem(theme.name) || theme.base;
	}

	function toggle(theme) {
		return document.querySelector('[data-' + theme.name + '-toggle]');
	}

	function cap(word) {
		return word.charAt(0).toUpperCase() + word.slice(1);
	}

	function apply(theme, value) {
		if (value === theme.base) {
			delete root.dataset[theme.name];
			localStorage.removeItem(theme.name);
		} else {
			root.dataset[theme.name] = value;
			localStorage.setItem(theme.name, value);
		}
		paint();
	}

	/* Every control repaints on every change, so two controls for the same theme
	 * can never disagree about what is applied. Painting never applies, so they
	 * cannot chase each other. */
	function paint() {
		themes.forEach(function (theme) {
			var button = toggle(theme);
			if (button) button.textContent = cap(theme.name) + ': ' + cap(current(theme));
		});
	}

	themes.forEach(function (theme) {
		var button = toggle(theme);
		if (!button) return;

		button.addEventListener('click', function () {
			var next = theme.values[(theme.values.indexOf(current(theme)) + 1) % theme.values.length];
			apply(theme, next);
		});
	});

	paint();
}
