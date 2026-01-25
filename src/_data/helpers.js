export const buildCommit = () => {
	if (process.env.COMMIT_REF) {
		const hash = process.env.COMMIT_REF;
		const commitSlice = commit.slice(0, 7);
		const commit = `<a href="https://github.com/apleasantview/eleventy-plugin-baseline/commit/${hash}">${commitSlice}</a>`;
		return commit;
	}
	const commit = 'local build';
	return commit;
};
