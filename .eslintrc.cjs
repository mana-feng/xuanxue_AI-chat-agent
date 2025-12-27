const path = require('path');

const frontendNodeModules = path.join(__dirname, 'frontend', 'node_modules');
const resolveFromFrontend = (moduleName) => require.resolve(moduleName, { paths: [frontendNodeModules] });

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
	parser: resolveFromFrontend('vue-eslint-parser'),
	parserOptions: {
		parser: resolveFromFrontend('@typescript-eslint/parser'),
		ecmaVersion: 'latest',
		sourceType: 'module',
		extraFileExtensions: ['.vue', '.nvue'],
	},
	plugins: ['@typescript-eslint'],
	ignorePatterns: ['dist', 'unpackage', 'node_modules', '**/__volar_global.d.ts'],
	globals: {
		uni: 'readonly',
	},
	rules: {
		'vue/multi-word-component-names': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'prettier/prettier': 'off',
	},
	overrides: [
		{
			files: [
				'src/components/**/*.vue',
				'src/components/**/*.nvue',
				'src/pages/**/*.vue',
				'src/pages/**/*.nvue',
				'src/chat/**/*.vue',
				'src/chat/**/*.nvue',
			],
			rules: {
				'@typescript-eslint/no-unused-vars': 'off',
				'no-unreachable': 'off',
				'vue/attributes-order': 'off',
				'vue/attribute-hyphenation': 'off',
			},
			globals: {
				uni: 'readonly',
			},
		},
		{
			files: ['server/**/*.js', 'backend/**/*.js'],
			rules: {
				'@typescript-eslint/no-var-requires': 'off',
				'@typescript-eslint/no-unused-vars': 'off',
				'no-control-regex': 'off',
				'no-useless-escape': 'off',
			},
		},
		{
			files: ['**/*.nvue'],
			rules: {
				'no-undef': 'off',
				'prettier/prettier': 'off',
				'vue/comment-directive': 'off',
				'@typescript-eslint/no-unused-vars': 'off',
			},
			globals: {
				uni: 'readonly',
			},
		},
	],
};


