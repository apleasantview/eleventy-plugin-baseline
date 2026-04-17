import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['./_baseline/**/__tests__/**/*.test.js'],
		reporters: ['verbose']
	}
});
