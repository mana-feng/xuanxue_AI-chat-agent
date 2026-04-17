import { defineConfig, loadEnv } from "vite";
import path from "path";
import uni from "@dcloudio/vite-plugin-uni";
import progress from "vite-plugin-progress";

function toBoolean(value: string | undefined, defaultValue: boolean) {
	if (value === undefined || value === null || value === "") return defaultValue;
	const normalized = String(value).trim().toLowerCase();
	if (normalized === "true") return true;
	if (normalized === "false") return false;
	return defaultValue;
}

function resolveOrigin(input: string) {
	try {
		return new URL(input).origin;
	} catch {
		return "";
	}
}

function buildCspHeader(options: {
	allowUnsafeInline: boolean;
	allowUnsafeStyleInline: boolean;
	allowUnsafeEval: boolean;
	connectSrcExtra: string[];
	scriptHashes: string[];
	nonce?: string;
}) {
	const scriptSrc = ["'self'", "blob:"];
	const scriptSrcElem = ["'self'", "blob:"];
	const styleSrc = ["'self'"];
	const connectSrc = [
		"'self'",
		"ws:",
		"wss:",
		...options.connectSrcExtra.filter(Boolean),
	];

	if (options.allowUnsafeInline) {
		scriptSrc.push("'unsafe-inline'");
		scriptSrcElem.push("'unsafe-inline'");
	}
	if (options.allowUnsafeStyleInline) {
		styleSrc.push("'unsafe-inline'");
	}
	if (options.allowUnsafeEval) {
		scriptSrc.push("'unsafe-eval'");
		scriptSrcElem.push("'unsafe-eval'");
	}
	for (const hash of options.scriptHashes) {
		const normalizedHash =
			/^'sha(256|384|512)-.+='$/.test(hash) || /^'sha(256|384|512)-.+='$/.test(hash.trim())
				? hash.trim()
				: /^sha(256|384|512)-.+=$/.test(hash.trim())
					? `'${hash.trim()}'`
					: hash.trim();
		scriptSrc.push(normalizedHash);
		scriptSrcElem.push(normalizedHash);
	}
	if (options.nonce) {
		scriptSrc.push(`'nonce-${options.nonce}'`);
		scriptSrcElem.push(`'nonce-${options.nonce}'`);
		if (!options.allowUnsafeStyleInline) {
			styleSrc.push(`'nonce-${options.nonce}'`);
		}
	}

	return [
		`default-src 'self'`,
		`script-src ${scriptSrc.join(" ")}`,
		`script-src-elem ${scriptSrcElem.join(" ")}`,
		`style-src ${styleSrc.join(" ")}`,
		`img-src 'self' data: blob: https://cdn.dcimg.net`,
		`connect-src ${Array.from(new Set(connectSrc)).join(" ")}`,
		`font-src 'self' data:`,
		`object-src 'none'`,
		`base-uri 'self'`,
		`frame-ancestors 'none'`,
	].join("; ");
}

function buildSecurityHeaders(options: { cspHeader: string; httpsEnabled: boolean }) {
	const headers: Record<string, string> = {
		"Content-Security-Policy": options.cspHeader,
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "DENY",
		"Referrer-Policy": "strict-origin-when-cross-origin",
	};

	if (options.httpsEnabled) {
		headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
	}

	return headers;
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, __dirname);
	const devPort = Number(process.env.VITE_DEV_PORT || env.VITE_DEV_PORT) || 3002;
	const platform = process.env.UNI_PLATFORM || "h5";
	const isH5 = platform === "h5";
	const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:3001";
	const cspNonce = env.VITE_CSP_NONCE || "local-dev-csp-nonce";
	const connectSrcExtra = [resolveOrigin(apiTarget), env.VITE_CSP_CONNECT_SRC].filter(Boolean);
	const scriptHashes = (env.VITE_CSP_SCRIPT_HASHES || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	const cspHeader = buildCspHeader({
		allowUnsafeInline: toBoolean(env.VITE_CSP_ALLOW_UNSAFE_INLINE, true),
		allowUnsafeStyleInline: toBoolean(env.VITE_CSP_ALLOW_UNSAFE_STYLE_INLINE, false),
		allowUnsafeEval: toBoolean(env.VITE_CSP_ALLOW_UNSAFE_EVAL, true),
		connectSrcExtra,
		scriptHashes,
		nonce: cspNonce,
	});
	const securityHeaders = buildSecurityHeaders({ cspHeader, httpsEnabled: false });

	return {
		server: {
			port: devPort,
			strictPort: true,
			headers: securityHeaders,
			proxy: {
				"/api": {
					target: apiTarget,
					changeOrigin: true,
					secure: false,
					ws: true,
				},
			},
			hmr: {
				overlay: false,
				protocol: "ws",
				clientHost: "localhost",
				clientPort: devPort,
			},
		},
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "src"),
			},
		},
		define: {
			__VUE_I18N_FULL_INSTALL__: true,
			__VUE_I18N_LEGACY_API__: false,
			__INTLIFY_PROD_DEVTOOLS__: false,
		},
		plugins: [
			progress({
				format: "building [:bar] :percent",
				total: 100,
				width: 100,
				complete: "=",
				incomplete: "",
			}),
			uni(),
			{
				name: "dev-csp-nonce",
				transformIndexHtml: {
					order: "post",
					handler(html) {
						return html
							.replace(/<script(?![^>]*\bnonce=)/g, `<script nonce="${cspNonce}"`)
							.replace(/<style(?![^>]*\bnonce=)/g, `<style nonce="${cspNonce}"`);
					},
				},
			},
		],
		css: {
			preprocessorOptions: {
				scss: {
					silenceDeprecations: ["legacy-js-api"],
				},
			},
		},
		build: {
			sourcemap: false,
			cssCodeSplit: true,
			rollupOptions: isH5
				? {
						output: {
							inlineDynamicImports: true,
							format: "es",
						},
					}
				: undefined,
			minify: "terser",
			terserOptions: {
				compress: {
					drop_console: false,
					drop_debugger: true,
				},
			},
		},
	};
});
