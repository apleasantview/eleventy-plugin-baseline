import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['./_baseline/**/__tests__/**/*.test.js'],
		exclude: [...configDefaults.exclude, 'temp/**'],
		reporters: ['verbose']
	}
});
