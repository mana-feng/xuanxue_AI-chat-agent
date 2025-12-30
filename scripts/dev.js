const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const net = require("net");
const tls = require("tls");
const { spawn } = require("child_process");

const root = process.cwd();

const certDir = path.join(root, "cert");
const keyPath = path.join(certDir, "localhost-key.pem");
const certPath = path.join(certDir, "localhost.pem");

const FE_HOST = "localhost";
const FE_PORT = 24678;
const BE_HOST = "localhost";
const BE_PORT = 3001;
const PUBLIC_PORT = 3000;

const opts = {
	key: fs.readFileSync(keyPath),
	cert: fs.readFileSync(certPath),
};

function isApiRequest(url) {
	return typeof url === "string" && url.startsWith("/api");
}

function pipeHttpRequest({ req, res, target }) {
	const client = target.protocol === "https:" ? https : http;

	const headers = { ...req.headers, host: `${target.hostname}:${target.port}` };
	if (typeof headers.origin === "string" && target.rewriteOrigin) {
		headers.origin = target.rewriteOrigin;
	}

	const proxyReq = client.request(
		{
			hostname: target.hostname,
			port: target.port,
			path: req.url,
			method: req.method,
			headers,
			rejectUnauthorized: target.rejectUnauthorized === false ? false : undefined,
		},
		(proxyRes) => {
			res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
			proxyRes.on("error", () => {});
			res.on("error", () => {});
			proxyRes.pipe(res);
		}
	);

	const abortProxyReq = () => {
		try {
			proxyReq.destroy();
		} catch {}
	};

	req.on("aborted", abortProxyReq);
	req.on("error", () => {});
	res.on("close", abortProxyReq);

	proxyReq.on("error", (e) => {
		res.statusCode = 502;
		res.end(`proxy error: ${e.message}`);
	});

	req.pipe(proxyReq);
}

function writeUpgradeRequest(upstream, req, { host, port, rewriteOrigin }) {
	const headers = { ...req.headers };
	headers.host = `${host}:${port}`;
	if (typeof headers.origin === "string" && rewriteOrigin) {
		headers.origin = rewriteOrigin;
	}

	upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
	for (const [name, value] of Object.entries(headers)) {
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			upstream.write(`${name}: ${value.join(", ")}\r\n`);
		} else {
			upstream.write(`${name}: ${value}\r\n`);
		}
	}
	upstream.write("\r\n");
}

function pipeUpgrade({ req, socket, head, target }) {
	socket.on("error", () => {});

	const connect =
		target.protocol === "https:"
			? (cb) =>
					tls.connect(
						{
							host: target.hostname,
							port: target.port,
							rejectUnauthorized: target.rejectUnauthorized === false ? false : true,
						},
						cb
					)
			: (cb) => net.connect(target.port, target.hostname, cb);

	const upstream = connect(() => {
		upstream.on("error", () => {});
		upstream.on("close", () => {
			try {
				socket.destroy();
			} catch {}
		});

		writeUpgradeRequest(upstream, req, {
			host: target.hostname,
			port: target.port,
			rewriteOrigin: target.rewriteOrigin,
		});

		if (head && head.length > 0) upstream.write(head);

		socket.pipe(upstream);
		upstream.pipe(socket);
	});

	upstream.on("error", () => {
		try {
			socket.destroy();
		} catch {}
	});

	socket.on("close", () => {
		try {
			upstream.destroy();
		} catch {}
	});
}

const proxy = https.createServer(opts, (req, res) => {
	const isApi = isApiRequest(req.url);

	if (isApi) {
		pipeHttpRequest({
			req,
			res,
			target: {
				protocol: "https:",
				hostname: BE_HOST,
				port: BE_PORT,
				rejectUnauthorized: false,
			},
		});
		return;
	}

	pipeHttpRequest({
		req,
		res,
		target: {
			protocol: "http:",
			hostname: FE_HOST,
			port: FE_PORT,
			rejectUnauthorized: false,
		},
	});
});

proxy.on("clientError", (_err, socket) => {
	try {
		socket.destroy();
	} catch {}
});

proxy.on("tlsClientError", () => {});

proxy.on("upgrade", (req, socket, head) => {
	const isApi = isApiRequest(req.url);

	if (isApi) {
		pipeUpgrade({
			req,
			socket,
			head,
			target: {
				protocol: "https:",
				hostname: BE_HOST,
				port: BE_PORT,
				rejectUnauthorized: false,
			},
		});
		return;
	}

	pipeUpgrade({
		req,
		socket,
		head,
		target: {
			protocol: "http:",
			hostname: FE_HOST,
			port: FE_PORT,
			rewriteOrigin: `http://${FE_HOST}:${FE_PORT}`,
			rejectUnauthorized: false,
		},
	});
});

proxy.on("error", (err) => {
	if (err && err.code === "EADDRINUSE") {
		console.error(`端口 ${PUBLIC_PORT} 已被占用`);
		process.exit(1);
	}
	console.error(err);
	process.exit(1);
});

proxy.listen(PUBLIC_PORT, () => console.log(`Dev proxy listening on https://localhost:${PUBLIC_PORT}`));

const fe = spawn("npm --prefix frontend run dev:h5", {
	cwd: root,
	stdio: "inherit",
	shell: true,
	env: {
		...process.env,
		VITE_DEV_PORT: String(FE_PORT),
		VITE_DEV_HTTPS: "false",
	},
});

const be = spawn("npm --prefix backend start", {
	cwd: root,
	stdio: "inherit",
	shell: true,
});

const stop = (code, source) => {
	console.log(`[${source || 'UNKNOWN'}] Process exited with code ${code}`);
	try {
		proxy.close();
	} catch {}
	try {
		fe.kill("SIGINT");
	} catch {}
	try {
		be.kill("SIGINT");
	} catch {}
	process.exit(typeof code === "number" ? code : 0);
};

process.on("SIGINT", () => stop(0, "SIGINT"));
process.on("SIGTERM", () => stop(0, "SIGTERM"));
fe.on("exit", (code) => stop(code, "FRONTEND"));
be.on("exit", (code) => stop(code, "BACKEND"));
