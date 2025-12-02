// 性能监控工具
// 用于监控 API 性能和系统资源使用情况

const express = require('express');
const os = require('os');

class PerformanceMonitor {
	constructor() {
		this.metrics = {
			requests: {
				total: 0,
				byEndpoint: {},
				byMethod: {}
			},
			responseTimes: [],
			errors: {
				total: 0,
				byEndpoint: {}
			},
			cache: {
				hits: 0,
				misses: 0
			},
			startTime: Date.now()
		};
	}

	recordRequest(endpoint, method, duration, cached = false) {
		this.metrics.requests.total++;
		
		// 按端点统计
		if (!this.metrics.requests.byEndpoint[endpoint]) {
			this.metrics.requests.byEndpoint[endpoint] = 0;
		}
		this.metrics.requests.byEndpoint[endpoint]++;
		
		// 按方法统计
		if (!this.metrics.requests.byMethod[method]) {
			this.metrics.requests.byMethod[method] = 0;
		}
		this.metrics.requests.byMethod[method]++;
		
		// 记录响应时间
		this.metrics.responseTimes.push(duration);
		if (this.metrics.responseTimes.length > 1000) {
			this.metrics.responseTimes.shift(); // 只保留最近1000条
		}
		
		// 缓存统计
		if (cached) {
			this.metrics.cache.hits++;
		} else {
			this.metrics.cache.misses++;
		}
	}

	recordError(endpoint, error) {
		this.metrics.errors.total++;
		if (!this.metrics.errors.byEndpoint[endpoint]) {
			this.metrics.errors.byEndpoint[endpoint] = 0;
		}
		this.metrics.errors.byEndpoint[endpoint]++;
	}

	getStats() {
		const responseTimes = this.metrics.responseTimes;
		const sortedTimes = [...responseTimes].sort((a, b) => a - b);
		
		const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
		const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
		const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
		
		const uptime = Date.now() - this.metrics.startTime;
		const qps = this.metrics.requests.total / (uptime / 1000);
		
		const cacheHitRate = this.metrics.cache.hits + this.metrics.cache.misses > 0
			? (this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses) * 100).toFixed(2)
			: 0;
		
		const memUsage = process.memoryUsage();
		const totalMem = os.totalmem();
		const freeMem = os.freemem();
		
		return {
			uptime: {
				seconds: Math.floor(uptime / 1000),
				formatted: formatUptime(uptime)
			},
			requests: {
				total: this.metrics.requests.total,
				qps: qps.toFixed(2),
				byEndpoint: this.metrics.requests.byEndpoint,
				byMethod: this.metrics.requests.byMethod
			},
			responseTime: {
				avg: responseTimes.length > 0 
					? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)
					: 0,
				p50: p50.toFixed(2),
				p95: p95.toFixed(2),
				p99: p99.toFixed(2),
				min: responseTimes.length > 0 ? Math.min(...responseTimes).toFixed(2) : 0,
				max: responseTimes.length > 0 ? Math.max(...responseTimes).toFixed(2) : 0
			},
			cache: {
				hits: this.metrics.cache.hits,
				misses: this.metrics.cache.misses,
				hitRate: `${cacheHitRate}%`
			},
			errors: {
				total: this.metrics.errors.total,
				byEndpoint: this.metrics.errors.byEndpoint
			},
			memory: {
				heapUsed: formatBytes(memUsage.heapUsed),
				heapTotal: formatBytes(memUsage.heapTotal),
				rss: formatBytes(memUsage.rss),
				external: formatBytes(memUsage.external),
				systemTotal: formatBytes(totalMem),
				systemFree: formatBytes(freeMem),
				systemUsed: formatBytes(totalMem - freeMem),
				systemUsagePercent: ((totalMem - freeMem) / totalMem * 100).toFixed(2)
			},
			cpu: {
				loadAverage: os.loadavg(),
				cpus: os.cpus().length
			}
		};
	}

	reset() {
		this.metrics = {
			requests: {
				total: 0,
				byEndpoint: {},
				byMethod: {}
			},
			responseTimes: [],
			errors: {
				total: 0,
				byEndpoint: {}
			},
			cache: {
				hits: 0,
				misses: 0
			},
			startTime: Date.now()
		};
	}
}

function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(ms) {
	const seconds = Math.floor(ms / 1000);
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;
	
	if (days > 0) {
		return `${days}天 ${hours}小时 ${minutes}分钟`;
	} else if (hours > 0) {
		return `${hours}小时 ${minutes}分钟`;
	} else if (minutes > 0) {
		return `${minutes}分钟 ${secs}秒`;
	} else {
		return `${secs}秒`;
	}
}

// Express 中间件
function performanceMiddleware(monitor) {
	return (req, res, next) => {
		const startTime = Date.now();
		const endpoint = req.path;
		const method = req.method;
		
		// 监听响应完成
		res.on('finish', () => {
			const duration = Date.now() - startTime;
			const cached = res.getHeader('X-Cache') === 'HIT';
			
			if (res.statusCode >= 400) {
				monitor.recordError(endpoint, res.statusCode);
			}
			
			monitor.recordRequest(endpoint, method, duration, cached);
		});
		
		next();
	};
}

// 创建监控 API 路由
function createMonitorRoutes(monitor) {
	const router = express.Router();
	
	router.get('/stats', (req, res) => {
		res.json(monitor.getStats());
	});
	
	router.get('/stats/json', (req, res) => {
		res.json(monitor.getStats());
	});
	
	router.post('/stats/reset', (req, res) => {
		monitor.reset();
		res.json({ success: true, message: '统计数据已重置' });
	});
	
	return router;
}

module.exports = {
	PerformanceMonitor,
	performanceMiddleware,
	createMonitorRoutes
};

