module.exports = {
	root: true,
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:vue/vue3-recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:prettier/recommended',
	],
	parser: 'vue-eslint-parser',
	parserOptions: {
		parser: '@typescript-eslint/parser',
		ecmaVersion: 'latest',
		sourceType: 'module',
		extraFileExtensions: ['.vue', '.nvue'],
	},
	plugins: ['@typescript-eslint'],
	ignorePatterns: ['dist', 'unpackage', 'node_modules'],
	rules: {
		'vue/multi-word-component-names': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
	},
};


