/**
 * 绠＄悊鍛樿矾鐢? * 娉ㄦ剰锛氭墍鏈夌鐞嗗憳鎿嶄綔閮芥槸鏁忔劅鎿嶄綔锛屽缓璁坊鍔燗PI绛惧悕楠岃瘉
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../db');
const ConfigService = require('../config-service');
const { adminMiddleware } = require('../middleware/auth');
const { reloadEmailConfig } = require('../services/email');
const { reloadScheduler } = require('../services/scheduler');
const SecurityUtils = require('../security');
const { apiSignatureMiddleware } = require('../middleware/api-signature');

const db = getDatabase();
const ADMIN_RECORD_TYPE_TABLE_MAP = Object.freeze({
	bazi: 'bazi_records',
	liuyao: 'liuyao_records',
	ziwei: 'ziwei_records',
});
const ADMIN_RECORD_TYPES = Object.keys(ADMIN_RECORD_TYPE_TABLE_MAP);

function normalizeAdminRecordType(inputType, { allowAll = false, defaultType = 'bazi' } = {}) {
	const normalized = String(inputType || '').trim().toLowerCase();
	if (allowAll && normalized === 'all') {
		return 'all';
	}
	if (Object.prototype.hasOwnProperty.call(ADMIN_RECORD_TYPE_TABLE_MAP, normalized)) {
		return normalized;
	}
	return defaultType;
}

function buildAdminRecordSelectQuery(tableName, chartType, whereClause = '') {
	return `
		SELECT 
			r.id, 
			r.name, 
			r.gender, 
			r.birth_datetime AS birthDatetime, 
			r.calendar_type AS calendarType,
			r.created_at AS createdAt,
			u.id AS userId,
			u.email AS userEmail,
			u.username AS userUsername,
			'${chartType}' AS chartType
		FROM ${tableName} r
		LEFT JOIN users u ON r.user_id = u.id
		${whereClause}
	`;
}

function parseAdminRawPayload(rawPayload) {
	if (!rawPayload) {
		return null;
	}
	try {
		return typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
	} catch (e) {
		console.error('Admin route error');
		return rawPayload;
	}
}

/**
 * 鍏憡绠＄悊
 */
router.get('/announcements', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	try {
		const rows = await db.all(
			'SELECT id, title, content, expires_at AS expiresAt, updated_at AS updatedAt, created_at AS createdAt FROM announcements ORDER BY updated_at DESC'
		);
		res.json(rows || []);
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鑾峰彇鍏憡鍒楄〃澶辫触' });
	}
});

router.post('/announcements', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { title, content, expiresAt } = req.body || {};
	if (!title || !content) {
		return res.status(400).json({ error: '请求失败' });
	}
	try {
		const result = await db.run(
			'INSERT INTO announcements (title, content, expires_at, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
			[title, content, expiresAt || null]
		);
		res.json({ success: true, id: result.lastID });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鍒涘缓鍏憡澶辫触' });
	}
});

router.put('/announcements/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = parseInt(req.params.id, 10);
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勫叕鍛奍D' });
	}
	const { title, content, expiresAt } = req.body || {};
	if (!title || !content) {
		return res.status(400).json({ error: '请求失败' });
	}
	try {
		await db.run(
			'UPDATE announcements SET title = ?, content = ?, expires_at = ?, updated_at = NOW() WHERE id = ?',
			[title, content, expiresAt || null, id]
		);
		res.json({ success: true });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏇存柊鍏憡澶辫触' });
	}
});

router.delete('/announcements/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = parseInt(req.params.id, 10);
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勫叕鍛奍D' });
	}
	try {
		await db.run('DELETE FROM announcements WHERE id = ?', [id]);
		res.json({ success: true });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鍒犻櫎鍏憡澶辫触' });
	}
});

/**
 * 鑾峰彇閭閰嶇疆
 */
router.get('/email-config', adminMiddleware, async (req, res) => {
	try {
		const cfg = await ConfigService.getEmailConfig(db);
		const configured = await ConfigService.isEmailConfigValid(db);
		res.json({
			configured,
			host: cfg.host || '',
			port: cfg.port || 0,
			user: cfg.user || '',
			from: cfg.from || '',
			fromName: cfg.fromName || '',
		});
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鑾峰彇閭欢閰嶇疆澶辫触' });
	}
});

/**
 * 鏇存柊閭閰嶇疆
 */
router.put('/email-config', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { host, port, user, pass, from, fromName } = req.body || {};

	try {
		// 娓呯悊鍜岄獙璇佽緭鍏?
		const sanitizedHost = SecurityUtils.sanitizeString(String(host || ''), {
			maxLength: 200,
		}).trim();
		const sanitizedUser = SecurityUtils.sanitizeString(String(user || ''), {
			maxLength: 200,
		}).trim();
		const sanitizedFrom = SecurityUtils.sanitizeString(String(from || ''), {
			maxLength: 200,
		}).trim();
		const sanitizedFromName = fromName
			? SecurityUtils.sanitizeString(String(fromName), {
					maxLength: 200,
					allowSpecialChars: true,
				}).trim()
			: '';
		const portNum = Number(port);

		// 楠岃瘉蹇呭～椤?
		if (!sanitizedHost) {
			return res.status(400).json({ error: 'SMTP 鏈嶅姟鍣ㄥ湴鍧€涓嶈兘涓虹┖' });
		}
		if (!sanitizedUser) {
			return res.status(400).json({ error: '閭璐﹀彿涓嶈兘涓虹┖' });
		}
		if (Number.isNaN(portNum) || portNum <= 0 || portNum > 65535) {
			return res.status(400).json({ error: '请求失败' });
		}
		if (!sanitizedFrom || !SecurityUtils.isValidEmail(sanitizedFrom)) {
			return res.status(400).json({ error: '鍙戜欢浜洪偖绠辨牸寮忎笉姝ｇ‘' });
		}

		// 瀵嗙爜澶勭悊锛氬鏋滄彁渚涘垯鏇存柊锛屽惁鍒欐鏌ユ槸鍚﹀凡鏈夊瘑鐮?
		let finalPass = null;
		if (pass && String(pass).trim()) {
			finalPass = String(pass).trim();
		} else {
			const existingPass = await ConfigService.getConfig(db, 'EMAIL_PASS');
			if (!existingPass) {
				return res.status(400).json({ error: '请求失败' });
			}
			finalPass = existingPass;
		}

		// 浣跨敤鏂扮殑鎵归噺璁剧疆鏂规硶
		await ConfigService.setEmailConfig(db, {
			host: sanitizedHost,
			port: portNum,
			user: sanitizedUser,
			pass: finalPass,
			from: sanitizedFrom,
			fromName: sanitizedFromName,
		});

		// 閲嶆柊鍔犺浇閰嶇疆
		await reloadEmailConfig();

		res.json({ success: true, message: '操作成功' });
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鏇存柊閭欢閰嶇疆澶辫触' });
	}
});

/**
 * 鑾峰彇閭閰嶇疆鍘嗗彶
 */
router.get('/email-configs', adminMiddleware, async (req, res) => {
	try {
		const list = await ConfigService.getEmailConfigs(db);
		res.json({ success: true, data: list });
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鑾峰彇閭閰嶇疆鍘嗗彶澶辫触' });
	}
});

/**
 * 鍒囨崲婵€娲荤殑閭閰嶇疆
 */
router.post('/email-configs/:id/activate', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	try {
		const configId = parseInt(req.params.id, 10);
		if (!configId || isNaN(configId)) {
			return res.status(400).json({ error: '鏃犳晥鐨勯厤缃甀D' });
		}
		await ConfigService.activateEmailConfig(db, configId);
		await reloadEmailConfig();
		res.json({ success: true, message: '操作成功' });
	} catch (e) {
		console.error('Admin route error');
		const msg = '鍒囨崲澶辫触';
		const status = msg.includes('') ? 404 : 400;
		res.status(status).json({ error: msg });
	}
});

/**
 * 鍒犻櫎閭閰嶇疆鍘嗗彶
 */
router.delete('/email-configs/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	try {
		const configId = parseInt(req.params.id, 10);
		if (!configId || isNaN(configId)) {
			return res.status(400).json({ error: '鏃犳晥鐨勯厤缃甀D' });
		}
		await ConfigService.deleteEmailConfig(db, configId);
		res.json({ success: true, message: '操作成功' });
	} catch (e) {
		console.error('Admin route error');
		const msg = '鍒犻櫎澶辫触';
		const status = msg.includes('') ? 404 : 400;
		res.status(status).json({ error: msg });
	}
});

/**
 * 鑾峰彇缁熻浠ｇ爜
 */
router.get('/analytics-snippet', adminMiddleware, async (req, res) => {
	try {
		const snippet = await ConfigService.getAnalyticsSnippet(db);
		res.json({ success: true, data: { snippet } });
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鑾峰彇缁熻浠ｇ爜澶辫触' });
	}
});

/**
 * 鏇存柊缁熻浠ｇ爜
 */
router.put('/analytics-snippet', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { snippet } = req.body || {};
	try {
		await ConfigService.setAnalyticsSnippet(
			db,
			snippet !== undefined && snippet !== null ? String(snippet) : ''
		);
		res.json({ success: true });
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鏇存柊缁熻浠ｇ爜澶辫触' });
	}
});

/**
 * 鑾峰彇 LLM 閰嶇疆
 */
router.get('/llm-config', adminMiddleware, async (req, res) => {
	try {
		const cfg = await ConfigService.getLLMConfig(db);
		// 灏濊瘯浠庡巻鍙茶褰曚腑鑾峰彇褰撳墠婵€娲荤殑妯″瀷鍚嶇О
		try {
			const models = await ConfigService.getLLMModels(db);
			const activeModel = models.find(m => m.is_active === 1);
			if (activeModel) {
				cfg.name = activeModel.name;
			}
		} catch (e) {
			console.warn('鑾峰彇妯″瀷鍚嶇О澶辫触:', e.message);
		}
		res.json(cfg);
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鑾峰彇閰嶇疆澶辫触' });
	}
});

/**
 * 淇濆瓨 LLM 閰嶇疆
 */
router.put('/llm-config', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { provider, baseUrl, apiKey, model, extra, name } = req.body || {};
	try {
		await ConfigService.setLLMConfig(db, {
			provider,
			baseUrl,
			apiKey,
			model,
			extra: extra !== undefined && extra !== null ? String(extra) : '',
			name,
		});
		res.json({ success: true });
	} catch (e) {
		console.error('Admin route error');
		res.status(400).json({ error: '淇濆瓨澶辫触' });
	}
});

/**
 * 鑾峰彇鎵€鏈夊巻鍙叉ā鍨嬮厤缃? */
router.get('/llm-models', adminMiddleware, async (req, res) => {
	try {
		const models = await ConfigService.getLLMModels(db);
		res.json({ success: true, data: models });
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鑾峰彇妯″瀷鍘嗗彶澶辫触' });
	}
});

/**
 * 鍒囨崲婵€娲荤殑妯″瀷閰嶇疆
 */
router.post('/llm-models/:id/activate', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	try {
		const modelId = parseInt(req.params.id, 10);
		if (!modelId || isNaN(modelId)) {
			return res.status(400).json({ error: '鏃犳晥鐨勬ā鍨?ID' });
		}
		await ConfigService.activateLLMModel(db, modelId);
		res.json({ success: true, message: '操作成功' });
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鍒囨崲妯″瀷澶辫触' });
	}
});

/**
 * 鍒犻櫎妯″瀷閰嶇疆
 */
router.delete('/llm-models/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	try {
		const modelId = parseInt(req.params.id, 10);
		if (!modelId || isNaN(modelId)) {
			return res.status(400).json({ error: '鏃犳晥鐨勬ā鍨?ID' });
		}
		await ConfigService.deleteLLMModel(db, modelId);
		res.json({ success: true, message: '操作成功' });
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鍒犻櫎妯″瀷澶辫触' });
	}
});

/**
 * 鑾峰彇棰濆害閲嶇疆閰嶇疆
 */
router.get('/quota-reset-config', adminMiddleware, async (req, res) => {
	try {
		const config = await ConfigService.getQuotaResetConfig(db);
		res.json(config);
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鑾峰彇閰嶇疆澶辫触' });
	}
});

/**
 * 淇濆瓨棰濆害閲嶇疆閰嶇疆
 */
router.put('/quota-reset-config', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	try {
		const { enabled, time, timezone, target } = req.body;
		await ConfigService.setQuotaResetConfig(db, {
			enabled,
			time,
			timezone,
			target
		});
		
		// 閲嶆柊鍔犺浇璋冨害鍣?
		await reloadScheduler();
		
		res.json({ success: true });
	} catch (e) {
		console.error('Admin route error');
		res.status(400).json({ error: '淇濆瓨澶辫触' });
	}
});

/**
 * 鑾峰彇缁熻鏁版嵁
 */
router.get('/stats', adminMiddleware, async (req, res) => {
	const queries = {
		totalUsers: 'SELECT COUNT(*) as count FROM users',
		totalRecords:
			'SELECT (SELECT COUNT(*) FROM bazi_records) + (SELECT COUNT(*) FROM liuyao_records) + (SELECT COUNT(*) FROM ziwei_records) as count',
		todayUsers: `SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()`,
		todayRecords: `SELECT (SELECT COUNT(*) FROM bazi_records WHERE DATE(created_at) = CURDATE()) + (SELECT COUNT(*) FROM liuyao_records WHERE DATE(created_at) = CURDATE()) + (SELECT COUNT(*) FROM ziwei_records WHERE DATE(created_at) = CURDATE()) as count`,
		adminUsers: "SELECT COUNT(*) as count FROM users WHERE role = 'admin'",
	};

	try {
		const results = {};
		const promises = Object.keys(queries).map(async (key) => {
			try {
				const row = await db.get(queries[key], []);
				results[key] = row?.count || 0;
			} catch (err) {
				console.error('Admin route error');
				results[key] = 0;
			}
		});

		await Promise.all(promises);
		res.json(results);
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鑾峰彇缁熻鏁版嵁澶辫触' });
	}
});

/**
 * 鑾峰彇璁垮織缁熻℃暟鎹
 */
router.get('/stats/analytics', adminMiddleware, async (req, res) => {
	try {
		const today = new Date().toISOString().split('T')[0];
		const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
		const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

		const safeGet = async (sql, params) => { try { return await db.get(sql, params); } catch (e) { return null; } };
		const safeAll = async (sql, params) => { try { return await db.all(sql, params); } catch (e) { return []; } };

		const [
			todayRows,
			yesterdayRows,
			totalRows,
			uniqueRows,
			sessionRows,
			weeklyRows,
			monthlyRows,
			deviceRows,
			browserRows,
			osRows,
			pageRows,
			referrerRows,
			connectionRows,
			referrerTypeRows,
			searchEngineRows,
			searchKeywordRows,
			screenResRows,
			hourlyRows,
			dailyTrendRows,
			dowRows,
			newVisitorRows,
			returningVisitorRows,
			bounceRows,
			entryPageRows,
			loadTimeRows,
			utmSourceRows,
			languageRows,
			timezoneRows,
			recentVisitRows,
		] = await Promise.all([
			safeGet('SELECT COUNT(*) as count FROM page_stats WHERE visit_date = ?', [today]),
			safeGet('SELECT COUNT(*) as count FROM page_stats WHERE visit_date = ?', [yesterday]),
			safeGet('SELECT COUNT(*) as count FROM page_stats'),
			safeGet('SELECT COUNT(DISTINCT pvid) as count FROM page_stats'),
			safeGet('SELECT COUNT(DISTINCT session_id) as count FROM page_stats'),
			safeGet('SELECT COUNT(*) as count FROM page_stats WHERE visit_date >= ?', [weekAgo]),
			safeGet('SELECT COUNT(*) as count FROM page_stats WHERE visit_date >= ?', [monthAgo]),
			safeAll('SELECT device_type, COUNT(*) as count FROM page_stats GROUP BY device_type'),
			safeAll("SELECT browser, browser_version, COUNT(*) as cnt FROM page_stats WHERE browser != '' GROUP BY browser, browser_version ORDER BY cnt DESC LIMIT 20"),
			safeAll("SELECT os, os_version, COUNT(*) as cnt FROM page_stats WHERE os != '' GROUP BY os, os_version ORDER BY cnt DESC LIMIT 20"),
			safeAll('SELECT pathname, ANY_VALUE(title) as title, COUNT(*) as count FROM page_stats GROUP BY pathname ORDER BY count DESC LIMIT 20'),
			safeAll("SELECT referrer, COUNT(*) as count FROM page_stats WHERE referrer != '' AND referrer NOT LIKE '%%' GROUP BY referrer ORDER BY count DESC LIMIT 20"),
			safeAll("SELECT connection_type, COUNT(*) as count FROM page_stats WHERE connection_type != '' AND connection_type != 'unknown' GROUP BY connection_type ORDER BY count DESC"),
			safeAll("SELECT referrer_type, COUNT(*) as count FROM page_stats WHERE referrer_type != '' GROUP BY referrer_type ORDER BY count DESC"),
			safeAll("SELECT search_engine, COUNT(*) as count FROM page_stats WHERE search_engine != '' GROUP BY search_engine ORDER BY count DESC"),
			safeAll("SELECT search_keyword, COUNT(*) as count FROM page_stats WHERE search_keyword != '' AND search_keyword NOT LIKE '%%' GROUP BY search_keyword ORDER BY count DESC LIMIT 20"),
			safeAll("SELECT CONCAT(screen_width,'x',screen_height) AS resolution, COUNT(*) as count FROM page_stats WHERE screen_width > 0 GROUP BY screen_width, screen_height ORDER BY count DESC LIMIT 10"),
			safeAll("SELECT visit_hour, COUNT(*) as count FROM page_stats GROUP BY visit_hour ORDER BY visit_hour"),
			safeAll("SELECT visit_date, COUNT(*) as pv, COUNT(DISTINCT pvid) as uv FROM page_stats GROUP BY visit_date ORDER BY visit_date DESC LIMIT 90"),
			safeAll("SELECT day_of_week, COUNT(*) as count FROM page_stats GROUP BY day_of_week ORDER BY day_of_week"),
			safeGet("SELECT COUNT(*) as count FROM page_stats WHERE is_new_visitor = 1"),
			safeGet("SELECT COUNT(*) as count FROM page_stats WHERE is_new_visitor = 0"),
			safeGet(`SELECT ROUND(100.0 * SUM(CASE WHEN hits=1 THEN 1 ELSE 0 END) / COUNT(*), 2) as rate FROM (SELECT session_id, COUNT(*) as hits FROM page_stats WHERE visit_date >= ? GROUP BY session_id) AS session_counts`, [monthAgo]),
			safeAll(`SELECT pathname, COUNT(*) as count FROM page_stats WHERE is_entry_page = 1 GROUP BY pathname ORDER BY count DESC LIMIT 10`),
			safeGet(`SELECT AVG(load_time) as avg_load, MIN(load_time) as min_load, MAX(load_time) as max_load, AVG(fcp_time) as avg_fcp, AVG(dom_content_loaded_time) as avg_dcl FROM page_stats WHERE load_time > 0`),
			safeAll("SELECT utm_source, utm_medium, utm_campaign, COUNT(*) as count FROM page_stats WHERE utm_source != '' GROUP BY utm_source, utm_medium, utm_campaign ORDER BY count DESC LIMIT 15"),
			safeAll("SELECT language, COUNT(*) as count FROM page_stats WHERE language != '' GROUP BY language ORDER BY count DESC LIMIT 10"),
			safeAll("SELECT timezone, COUNT(*) as count FROM page_stats WHERE timezone != '' GROUP BY timezone ORDER BY count DESC LIMIT 10"),
			safeAll("SELECT url, pathname, title, COALESCE(NULLIF(ip, ''), ip_encrypted) AS ip, screen_width, screen_height, pixel_ratio, language, device_type, browser, browser_version, os, os_version, referrer_type, created_at, is_logged_in, username FROM page_stats ORDER BY created_at DESC LIMIT 500"),
		]);

		const deviceStats = { mobile: 0, tablet: 0, desktop: 0 };
		for (const row of deviceRows) {
			const dtype = String(row.device_type || '').toLowerCase();
			if (dtype === 'mobile') deviceStats.mobile = Number(row.count) || 0;
			else if (dtype === 'tablet') deviceStats.tablet = Number(row.count) || 0;
			else deviceStats.desktop = Number(row.count) || 0;
		}

		const topBrowsers = browserRows.map(row => ({
			browser: row.browser || '',
			version: row.browser_version || '',
			count: Number(row.cnt) || 0,
		}));

		const topOs = osRows.map(row => ({
			os: row.os || '',
			version: row.os_version || '',
			count: Number(row.cnt) || 0,
		}));

		const topPages = pageRows.map(row => ({
			pathname: row.pathname || '/',
			title: row.title || '',
			count: Number(row.count) || 0,
		}));

		const topReferrers = referrerRows.map(row => ({
			referrer: row.referrer || '',
			count: Number(row.count) || 0,
		}));

		const connectionStats = connectionRows.map(row => ({
			type: row.connection_type || '',
			count: Number(row.count) || 0,
		}));


		const referrerTypeStats = referrerTypeRows.map(row => ({
			type: row.referrer_type || 'unknown',
			count: Number(row.count) || 0,
		}));

		const searchEngineStats = searchEngineRows.map(row => ({
			engine: row.search_engine || '',
			count: Number(row.count) || 0,
		}));

		const searchKeywords = searchKeywordRows.map(row => ({
			keyword: row.search_keyword || '',
			count: Number(row.count) || 0,
		}));

		const screenResolutions = screenResRows.map(row => ({
			resolution: row.resolution || '',
			count: Number(row.count) || 0,
		}));

		const hourlyData = Array.from({ length: 24 }, (_, i) => {
			const found = hourlyRows?.find(r => Number(r.visit_hour) === i);
			return { hour: i, count: found ? Number(found.count) : 0 };
		});

		const dailyTrend = (dailyTrendRows || []).map(row => ({
			date: row.visit_date,
			pv: Number(row.pv) || 0,
			uv: Number(row.uv) || 0,
		})).slice(0, 90).reverse();

		const dowData = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((name, i) => {
			const found = dowRows?.find(r => Number(r.day_of_week) === i);
			return { day: name, dayIndex: i, count: found ? Number(found.count) : 0 };
		});

		const newVisitorCount = Number(newVisitorRows?.count) || 0;
		const returningVisitorCount = Number(returningVisitorRows?.count) || 0;

		const bounceRate = Number(bounceRows?.rate) || 0;

		const entryPages = entryPageRows.map(row => ({
			pathname: row.pathname || '/',
			count: Number(row.count) || 0,
		}));

		const performanceStats = {
			avgLoadTime: Math.round(Number(loadTimeRows?.avg_load) || 0),
			minLoadTime: Math.round(Number(loadTimeRows?.min_load) || 0),
			maxLoadTime: Math.round(Number(loadTimeRows?.max_load) || 0),
			avgFCP: Math.round(Number(loadTimeRows?.avg_fcp) || 0),
			avgDCL: Math.round(Number(loadTimeRows?.avg_dcl) || 0),
		};

		const utmCampaigns = utmSourceRows.map(row => ({
			source: row.utm_source || '',
			medium: row.utm_medium || '',
			campaign: row.utm_campaign || '',
			count: Number(row.count) || 0,
		}));

		const languageStats = languageRows.map(row => ({
			language: row.language || '',
			count: Number(row.count) || 0,
		}));

		const timezoneStats = timezoneRows.map(row => ({
			timezone: row.timezone || '',
			count: Number(row.count) || 0,
		}));

		const recentVisitors = (recentVisitRows || []).map(row => ({
			url: row.url || '',
			pathname: row.pathname || '',
			title: row.title || '',
			ip: row.ip || '',
			screenWidth: Number(row.screen_width) || 0,
			screenHeight: Number(row.screen_height) || 0,
			pixelRatio: Number(row.pixel_ratio) || 1,
			language: row.language || '',
			deviceType: row.device_type || '',
			browser: row.browser || '',
			browserVersion: row.browser_version || '',
			os: row.os || '',
			osVersion: row.os_version || '',
			referrerType: row.referrer_type || '',
			time: row.created_at || '',
			isLoggedIn: !!row.is_logged_in,
			username: row.username || null,
		}));

		res.json({
			success: true,
			data: {
				todayPageviews: Number(todayRows?.count) || 0,
				yesterdayPageviews: Number(yesterdayRows?.count) || 0,
				totalPageviews: Number(totalRows?.count) || 0,
				uniqueVisitors: Number(uniqueRows?.count) || 0,
				totalSessions: Number(sessionRows?.count) || 0,
				weeklyPageviews: Number(weeklyRows?.count) || 0,
				monthlyPageviews: Number(monthlyRows?.count) || 0,
				deviceStats,
				topBrowsers,
				topOs,
				topPages,
				topReferrers,
				connectionStats,
				referrerTypeStats,
				searchEngineStats,
				searchKeywords,
				screenResolutions,
				hourlyData,
				dailyTrend,
				dowData,
				newVisitorCount,
				returningVisitorCount,
				bounceRate,
				entryPages,
				performanceStats,
				utmCampaigns,
				languageStats,
				timezoneStats,
				recentVisitors,
			},
		});
	} catch (e) {
		console.error('Get analytics error:', e.message);
		res.status(500).json({ error: 'Failed to get analytics' });
	}
});

/**
 * 鑾峰彇鐢ㄦ埛鍒楄〃
 */
router.get('/users', adminMiddleware, async (req, res) => {
	const page = Math.max(1, parseInt(req.query.page) || 1);
	const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 20));
	const offset = (page - 1) * pageSize;
	const search = req.query.search || '';

	let query = `
		SELECT 
			u.id, 
			u.email, 
			u.username, 
			u.role, 
			u.created_at,
			COUNT(b.id) as recordCount
		FROM users u
		LEFT JOIN bazi_records b ON u.id = b.user_id
	`;
	let countQuery = 'SELECT COUNT(*) as count FROM users';
	const params = [];
	const groupBy = ' GROUP BY u.id';

	if (search) {
		query += ' WHERE u.email LIKE ? OR u.username LIKE ?';
		countQuery += ' WHERE email LIKE ? OR username LIKE ?';
		const searchPattern = `%${search}%`;
		params.push(searchPattern, searchPattern);
	}

	query += groupBy + ` ORDER BY u.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
	const countParams = params;

	try {
		const countRow = await db.get(countQuery, countParams);
		const total = countRow?.count || 0;

		const rows = await db.all(query, params);

		res.json({
			list: rows || [],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏌ヨ澶辫触' });
	}
});

/**
 * 鑾峰彇鐢ㄦ埛AI棰濆害鍒楄〃
 */
router.get('/users-quotas', adminMiddleware, async (req, res) => {
	const page = Math.max(1, parseInt(req.query.page) || 1);
	const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 20));
	const offset = (page - 1) * pageSize;
	const search = req.query.search || '';

	let query = `
		SELECT 
			u.id as userId,
			u.email,
			u.username,
			COALESCE(q.remaining_daily_count, 0) as remainingCount,
			q.updated_at as updatedAt
		FROM users u
		LEFT JOIN user_llm_quotas q ON u.id = q.user_id
	`;
	let countQuery = 'SELECT COUNT(*) as count FROM users';
	const params = [];

	if (search) {
		query += ' WHERE u.email LIKE ? OR u.username LIKE ?';
		countQuery += ' WHERE email LIKE ? OR username LIKE ?';
		const searchPattern = `%${search}%`;
		params.push(searchPattern, searchPattern);
	}

	query += ` ORDER BY u.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
	const countParams = params;

	try {
		const countRow = await db.get(countQuery, countParams);
		const total = countRow?.count || 0;

		const rows = await db.all(query, params);

		res.json({
			list: rows || [],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏌ヨ澶辫触' });
	}
});

/**
 * 鑾峰彇鎸囧畾鐢ㄦ埛AI棰濆害
 */
router.get('/users/:id/quota', adminMiddleware, async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勭敤鎴稩D' });
	}

	try {
		const user = await db.get('SELECT id, email, username FROM users WHERE id = ?', [id]);
		if (!user) {
			return res.status(404).json({ error: '请求失败' });
		}

		const quota = await db.get('SELECT * FROM user_llm_quotas WHERE user_id = ?', [id]);

		res.json({
			userId: user.id,
			email: user.email,
			username: user.username,
			remainingCount: quota?.remaining_daily_count || 0,
			updatedAt: quota?.updated_at || null,
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏌ヨ澶辫触' });
	}
});

/**
 * 璁剧疆鎸囧畾鐢ㄦ埛AI棰濆害
 */
router.put('/users/:id/quota', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勭敤鎴稩D' });
	}

	const { remainingCount } = req.body || {};

	try {
		const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
		if (!user) {
			return res.status(404).json({ error: '请求失败' });
		}

		// 妫€鏌ユ槸鍚﹀凡瀛樺湪棰濆害璁板綍
		const existing = await db.get('SELECT user_id FROM user_llm_quotas WHERE user_id = ?', [id]);

		if (existing) {
			// 鏇存柊鐜版湁璁板綍
			const updateFields = [];
			const updateValues = [];

			if (remainingCount !== undefined) {
				updateFields.push('remaining_daily_count = ?');
				updateValues.push(remainingCount);
			}

			updateFields.push('per_minute_limit = 1');
			updateFields.push('updated_at = NOW()');
			updateValues.push(id);

			await db.run(
				`UPDATE user_llm_quotas 
				SET ${updateFields.join(', ')} 
				WHERE user_id = ?`,
				updateValues
			);
		} else {
			// 鍒涘缓鏂拌褰?
			await db.run(
				`INSERT INTO user_llm_quotas 
				(user_id, per_minute_limit, remaining_daily_count, remaining_token, updated_at) 
				VALUES (?, 1, ?, 0, NOW())`,
				[
					id,
					remainingCount !== undefined ? remainingCount : 0
				]
			);
		}

		res.json({ success: true, message: '棰濆害鏇存柊鎴愬姛' });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏇存柊澶辫触' });
	}
});

/**
 * 鍒涘缓鐢ㄦ埛
 */
router.post('/users', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { email, username, password, role = 'user' } = req.body || {};

	if (!email || !password) {
		return res.status(400).json({ error: '缂哄皯 email 鎴?password' });
	}

	// 浣跨敤瀹夊叏宸ュ叿楠岃瘉鍜屾竻鐞嗚緭鍏?
	const trimmedEmail = SecurityUtils.sanitizeString(String(email), {
		maxLength: 255,
	}).toLowerCase();

	if (!SecurityUtils.isValidEmail(trimmedEmail)) {
		return res.status(400).json({ error: '请求失败' });
	}

	// 楠岃瘉鐢ㄦ埛鍚嶏紙濡傛灉鎻愪緵锛?
	let trimmedUsername = null;
	if (username) {
		const usernameValidation = SecurityUtils.validateUsername(username);
		if (!usernameValidation.valid) {
			return res.status(400).json({ error: usernameValidation.error });
		}
		trimmedUsername = usernameValidation.sanitized;
	}

	// 楠岃瘉瀵嗙爜
	const passwordValidation = SecurityUtils.validatePassword(password);
	if (!passwordValidation.valid) {
		return res.status(400).json({ error: passwordValidation.error });
	}

	// 楠岃瘉瑙掕壊
	if (role !== 'user' && role !== 'admin') {
		return res.status(400).json({ error: '鏃犳晥鐨勮鑹诧紝蹇呴』鏄?user 鎴?admin' });
	}

	// 妫€鏌ラ偖绠辨垨鐢ㄦ埛鍚嶆槸鍚﹀凡瀛樺湪
	const checkQuery = trimmedUsername
		? 'SELECT id FROM users WHERE email = ? OR username = ?'
		: 'SELECT id FROM users WHERE email = ?';
	const checkParams = trimmedUsername ? [trimmedEmail, trimmedUsername] : [trimmedEmail];

	try {
		const row = await db.get(checkQuery, checkParams);

		if (row) {
			return res.status(409).json({ error: '请求失败' });
		}

		const passwordHash = bcrypt.hashSync(String(password), 10);

		const insertQuery = trimmedUsername
			? 'INSERT INTO users (email, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())'
			: 'INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, NOW())';
		const insertParams = trimmedUsername
			? [trimmedEmail, trimmedUsername, passwordHash, role]
			: [trimmedEmail, passwordHash, role];

		const result = await db.run(insertQuery, insertParams);

		res.json({
			success: true,
			user: {
				id: result.lastID,
				email: trimmedEmail,
				username: trimmedUsername,
				role: role,
			},
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鍒涘缓澶辫触' });
	}
});

/**
 * 鑾峰彇鐢ㄦ埛璇︽儏
 */
router.get('/users/:id', adminMiddleware, async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勭敤鎴稩D' });
	}

	try {
		const row = await db.get(
			'SELECT id, email, username, role, created_at FROM users WHERE id = ?',
			[id]
		);

		if (!row) {
			return res.status(404).json({ error: '请求失败' });
		}

		try {
			const countRow = await db.get(
				'SELECT COUNT(*) as count FROM bazi_records WHERE user_id = ?',
				[id]
			);
			res.json({
				...row,
				recordCount: countRow?.count || 0,
			});
		} catch (countErr) {
			console.error('Admin route error');
			res.json({
				...row,
				recordCount: 0,
			});
		}
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏌ヨ澶辫触' });
	}
});

/**
 * 鏇存柊鐢ㄦ埛淇℃伅
 */
router.put('/users/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const { email, username, password, role } = req.body || {};

	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勭敤鎴稩D' });
	}

	// 涓嶈兘淇敼鑷繁鐨勮鑹?
	if (role && req.user.id === id && role !== 'admin') {
		return res.status(400).json({ error: '请求失败' });
	}

	try {
		// 鍏堟煡璇㈢敤鎴锋槸鍚﹀瓨鍦?
		const userRow = await db.get('SELECT id, email, username, role FROM users WHERE id = ?', [id]);

		if (!userRow) {
			return res.status(404).json({ error: '请求失败' });
		}

		// 楠岃瘉鍜屽噯澶囨洿鏂版暟鎹?
		const updates = [];
		const params = [];

		// 鏇存柊閭
		if (email !== undefined) {
			const trimmedEmail = SecurityUtils.sanitizeString(String(email), {
				maxLength: 255,
			}).toLowerCase();
			if (!SecurityUtils.isValidEmail(trimmedEmail)) {
				return res.status(400).json({ error: '请求失败' });
			}
			updates.push('email = ?');
			params.push(trimmedEmail);
		}

		// 鏇存柊鐢ㄦ埛鍚?
		if (username !== undefined) {
			if (username === null || username === '') {
				updates.push('username = NULL');
			} else {
				const usernameValidation = SecurityUtils.validateUsername(username);
				if (!usernameValidation.valid) {
					return res.status(400).json({ error: usernameValidation.error });
				}
				updates.push('username = ?');
				params.push(usernameValidation.sanitized);
			}
		}

		// 鏇存柊瀵嗙爜
		if (password !== undefined && password !== null && password !== '') {
			const passwordValidation = SecurityUtils.validatePassword(password);
			if (!passwordValidation.valid) {
				return res.status(400).json({ error: passwordValidation.error });
			}
			const passwordHash = bcrypt.hashSync(String(password), 10);
			updates.push('password_hash = ?');
			params.push(passwordHash);
		}

		// 鏇存柊瑙掕壊
		if (role !== undefined) {
			if (role !== 'user' && role !== 'admin') {
				return res.status(400).json({ error: '鏃犳晥鐨勮鑹诧紝蹇呴』鏄?user 鎴?admin' });
			}
			updates.push('role = ?');
			params.push(role);
		}

		if (updates.length === 0) {
			return res.status(400).json({ error: '娌℃湁瑕佹洿鏂扮殑瀛楁' });
		}

		// 妫€鏌ラ偖绠卞拰鐢ㄦ埛鍚嶆槸鍚﹀啿绐?
		const checkConditions = [];
		const checkParams = [];

		if (email !== undefined) {
			checkConditions.push('email = ?');
			checkParams.push(
				SecurityUtils.sanitizeString(String(email), { maxLength: 255 }).toLowerCase()
			);
		}
		if (username !== undefined && username !== null && username !== '') {
			const usernameValidation = SecurityUtils.validateUsername(username);
			if (usernameValidation.valid) {
				checkConditions.push('username = ?');
				checkParams.push(usernameValidation.sanitized);
			}
		}

		if (checkConditions.length > 0) {
			checkParams.push(id);
			const checkQuery = `SELECT id FROM users WHERE (${checkConditions.join(' OR ')}) AND id != ?`;
			const checkRow = await db.get(checkQuery, checkParams);

			if (checkRow) {
				return res.status(409).json({ error: '请求失败' });
			}
		}

		params.push(id);
		const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
		const result = await db.run(updateQuery, params);

		if (result.changes === 0) {
			return res.status(404).json({ error: '请求失败' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏇存柊澶辫触' });
	}
});

/**
 * 鏇存柊鐢ㄦ埛瑙掕壊
 */
router.put('/users/:id/role', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const { role } = req.body || {};

	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勭敤鎴稩D' });
	}

	if (!role || (role !== 'user' && role !== 'admin')) {
		return res.status(400).json({ error: '鏃犳晥鐨勮鑹诧紝蹇呴』鏄?user 鎴?admin' });
	}

	// 涓嶈兘淇敼鑷繁鐨勮鑹?
	if (req.user.id === id) {
		return res.status(400).json({ error: '请求失败' });
	}

	try {
		const result = await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);

		if (result.changes === 0) {
			return res.status(404).json({ error: '请求失败' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏇存柊澶辫触' });
	}
});

/**
 * 鍒犻櫎鐢ㄦ埛
 */
router.delete('/users/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勭敤鎴稩D' });
	}

	// 涓嶈兘鍒犻櫎鑷繁
	if (req.user.id === id) {
		return res.status(400).json({ error: '涓嶈兘鍒犻櫎鑷繁' });
	}

	try {
		// 鍏堝垹闄よ鐢ㄦ埛鐨勬墍鏈夊叓瀛楄褰?
		await db.run('DELETE FROM bazi_records WHERE user_id = ?', [id]);

		// 鍐嶅垹闄ょ敤鎴?
		const result = await db.run('DELETE FROM users WHERE id = ?', [id]);

		if (result.changes === 0) {
			return res.status(404).json({ error: '请求失败' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鍒犻櫎澶辫触' });
	}
});

/**
 * 鑾峰彇鍏瓧璁板綍鍒楄〃
 */
/**
 * 鑾峰彇缁熶竴鎺掔洏璁板綍鍒楄〃锛堝叓瀛?鍏埢/绱井锛? */
router.get('/chart-records', adminMiddleware, async (req, res) => {
	const page = Math.max(1, parseInt(req.query.page, 10) || 1);
	const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
	const offset = (page - 1) * pageSize;
	const userId = req.query.userId ? SecurityUtils.validateId(req.query.userId) : null;
	const searchKeyword = req.query.search
		? SecurityUtils.sanitizeSearchKeyword(String(req.query.search))
		: '';
	const typeFilter = normalizeAdminRecordType(req.query.type, {
		allowAll: true,
		defaultType: 'all',
	});

	const conditions = [];
	const params = [];
	if (userId) {
		conditions.push('r.user_id = ?');
		params.push(userId);
	}
	if (searchKeyword) {
		conditions.push('(r.name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)');
		const searchPattern = `%${searchKeyword}%`;
		params.push(searchPattern, searchPattern, searchPattern);
	}
	const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

	try {
		let rows = [];
		let total = 0;

		if (typeFilter === 'all') {
			const unionSelects = ADMIN_RECORD_TYPES.map((chartType) =>
				buildAdminRecordSelectQuery(ADMIN_RECORD_TYPE_TABLE_MAP[chartType], chartType, whereClause)
			);
			const unionParams = [];
			ADMIN_RECORD_TYPES.forEach(() => {
				unionParams.push(...params);
			});

			const countQuery = `SELECT COUNT(*) as count FROM (${unionSelects.join(
				' UNION ALL '
			)}) all_records`;
			const listQuery = `SELECT * FROM (${unionSelects.join(
				' UNION ALL '
			)}) all_records ORDER BY createdAt DESC LIMIT ${pageSize} OFFSET ${offset}`;

			const countRow = await db.get(countQuery, unionParams);
			total = countRow?.count || 0;
			rows = await db.all(listQuery, unionParams);
		} else {
			const tableName = ADMIN_RECORD_TYPE_TABLE_MAP[typeFilter];
			const listQuery =
				buildAdminRecordSelectQuery(tableName, typeFilter, whereClause) +
				` ORDER BY r.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
			const countQuery = `SELECT COUNT(*) as count FROM ${tableName} r LEFT JOIN users u ON r.user_id = u.id${whereClause}`;

			const countRow = await db.get(countQuery, params);
			total = countRow?.count || 0;
			rows = await db.all(listQuery, params);
		}

		res.json({
			list: rows || [],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏌ヨ澶辫触' });
	}
});

/**
 * 鑾峰彇缁熶竴鎺掔洏璁板綍璇︽儏
 */
router.get('/chart-records/:id', adminMiddleware, async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const rawType = String(req.query.type || '').trim().toLowerCase();
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勮褰旾D' });
	}
	if (rawType === 'all') {
		return res.status(400).json({ error: '请求失败' });
	}

	const chartType = normalizeAdminRecordType(rawType, { defaultType: 'bazi' });
	const tableName = ADMIN_RECORD_TYPE_TABLE_MAP[chartType];

	try {
		const row = await db.get(
			`SELECT
				r.id,
				r.name,
				r.gender,
				r.birth_datetime AS birthDatetime,
				r.calendar_type AS calendarType,
				r.raw_payload AS rawPayload,
				r.created_at AS createdAt,
				u.id AS userId,
				u.email AS userEmail,
				u.username AS userUsername,
				'${chartType}' AS chartType
			FROM ${tableName} r
			LEFT JOIN users u ON r.user_id = u.id
			WHERE r.id = ?`,
			[id]
		);

		if (!row) {
			return res.status(404).json({ error: '请求失败' });
		}

		res.json({
			id: row.id,
			name: row.name,
			gender: row.gender,
			birthDatetime: row.birthDatetime,
			calendarType: row.calendarType,
			createdAt: row.createdAt,
			userId: row.userId,
			userEmail: row.userEmail,
			userUsername: row.userUsername,
			chartType: row.chartType,
			rawPayload: parseAdminRawPayload(row.rawPayload),
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏌ヨ澶辫触' });
	}
});

/**
 * 鍒涘缓缁熶竴鎺掔洏璁板綍
 */
router.post('/chart-records', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { type, userId, name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};
	const chartType = normalizeAdminRecordType(type || req.query.type, { defaultType: 'bazi' });
	const tableName = ADMIN_RECORD_TYPE_TABLE_MAP[chartType];

	if (!userId || birthDatetime === null || birthDatetime === undefined || birthDatetime === '') {
		return res.status(400).json({ error: '缂哄皯 userId 鎴?birthDatetime' });
	}

	try {
		const userRow = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
		if (!userRow) {
			return res.status(404).json({ error: '请求失败' });
		}

		const sanitizedName = name
			? SecurityUtils.sanitizeString(String(name), { maxLength: 100 })
			: null;
		const validatedGender = SecurityUtils.validateGender(gender);
		const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);
		if (!validatedDateTime) {
			return res.status(400).json({ error: '请求失败' });
		}

		const sanitizedCalendarType = calendarType
			? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 })
			: null;

		let rawPayloadJson = null;
		if (rawPayload) {
			try {
				const payloadStr = JSON.stringify(rawPayload);
				if (payloadStr.length > 1000000) {
					return res.status(400).json({ error: '请求失败' });
				}
				rawPayloadJson = payloadStr;
			} catch (e) {
				return res.status(400).json({ error: '鏁版嵁鏍煎紡閿欒锛屾棤娉曚繚瀛? ' });
			}
		}

		const insertSql = `INSERT INTO ${tableName} (user_id, name, gender, birth_datetime, calendar_type, raw_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`;
		const result = await db.run(insertSql, [
			userId,
			sanitizedName,
			validatedGender,
			validatedDateTime,
			sanitizedCalendarType,
			rawPayloadJson,
		]);

		res.json({
			success: true,
			record: {
				id: result.lastID,
				userId,
				name: sanitizedName,
				gender: validatedGender,
				birthDatetime: validatedDateTime,
				calendarType: sanitizedCalendarType,
				chartType,
			},
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鍒涘缓澶辫触' });
	}
});

/**
 * 鏇存柊缁熶竴鎺掔洏璁板綍
 */
router.put('/chart-records/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const rawType = String(req.body?.type || req.query.type || '').trim().toLowerCase();
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勮褰旾D' });
	}
	if (rawType === 'all') {
		return res.status(400).json({ error: '请求失败' });
	}

	const chartType = normalizeAdminRecordType(rawType, { defaultType: 'bazi' });
	const tableName = ADMIN_RECORD_TYPE_TABLE_MAP[chartType];
	const { userId, name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};

	try {
		const recordRow = await db.get(`SELECT id, user_id FROM ${tableName} WHERE id = ?`, [id]);
		if (!recordRow) {
			return res.status(404).json({ error: '请求失败' });
		}

		if (userId !== undefined && userId !== recordRow.user_id) {
			const userRow = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
			if (!userRow) {
				return res.status(404).json({ error: '请求失败' });
			}
		}

		const updates = [];
		const params = [];

		if (userId !== undefined) {
			updates.push('user_id = ?');
			params.push(userId);
		}

		if (name !== undefined) {
			if (name === null || name === '') {
				updates.push('name = NULL');
			} else {
				updates.push('name = ?');
				params.push(SecurityUtils.sanitizeString(String(name), { maxLength: 100 }));
			}
		}

		if (gender !== undefined) {
			updates.push('gender = ?');
			params.push(SecurityUtils.validateGender(gender));
		}

		if (birthDatetime !== undefined) {
			const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);
			if (!validatedDateTime) {
				return res.status(400).json({ error: '请求失败' });
			}
			updates.push('birth_datetime = ?');
			params.push(validatedDateTime);
		}

		if (calendarType !== undefined) {
			if (calendarType === null || calendarType === '') {
				updates.push('calendar_type = NULL');
			} else {
				updates.push('calendar_type = ?');
				params.push(SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 }));
			}
		}

		if (rawPayload !== undefined) {
			if (rawPayload === null) {
				updates.push('raw_payload = NULL');
			} else {
				try {
					const payloadStr = JSON.stringify(rawPayload);
					if (payloadStr.length > 1000000) {
						return res.status(400).json({ error: '请求失败' });
					}
					updates.push('raw_payload = ?');
					params.push(payloadStr);
				} catch (e) {
					return res.status(400).json({ error: '鏁版嵁鏍煎紡閿欒: ' });
				}
			}
		}

		if (updates.length === 0) {
			return res.status(400).json({ error: '娌℃湁瑕佹洿鏂扮殑瀛楁' });
		}

		params.push(id);
		const updateQuery = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`;
		const result = await db.run(updateQuery, params);
		if (result.changes === 0) {
			return res.status(404).json({ error: '请求失败' });
		}

		res.json({ success: true, chartType });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏇存柊澶辫触' });
	}
});

/**
 * 鍒犻櫎缁熶竴鎺掔洏璁板綍
 */
router.delete('/chart-records/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const rawType = String(req.query.type || '').trim().toLowerCase();
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勮褰旾D' });
	}
	if (rawType === 'all') {
		return res.status(400).json({ error: '请求失败' });
	}

	const chartType = normalizeAdminRecordType(rawType, { defaultType: 'bazi' });
	const tableName = ADMIN_RECORD_TYPE_TABLE_MAP[chartType];

	try {
		const result = await db.run(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
		if (result.changes === 0) {
			return res.status(404).json({ error: '请求失败' });
		}
		res.json({ success: true });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鍒犻櫎澶辫触' });
	}
});

router.get('/records', adminMiddleware, async (req, res) => {
	const page = Math.max(1, parseInt(req.query.page) || 1);
	const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 20));
	const offset = (page - 1) * pageSize;
	const userId = req.query.userId ? parseInt(req.query.userId) : null;
	const search = req.query.search || '';

	let query = `
		SELECT 
			r.id, 
			r.name, 
			r.gender, 
			r.birth_datetime AS birthDatetime, 
			r.calendar_type AS calendarType,
			r.created_at AS createdAt,
			u.id AS userId,
			u.email AS userEmail,
			u.username AS userUsername
		FROM bazi_records r
		LEFT JOIN users u ON r.user_id = u.id
	`;
	let countQuery = 'SELECT COUNT(*) as count FROM bazi_records r';
	const params = [];
	const conditions = [];

	if (userId) {
		conditions.push('r.user_id = ?');
		params.push(userId);
	}

	if (search) {
		conditions.push('(r.name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)');
		const searchPattern = `%${search}%`;
		params.push(searchPattern, searchPattern, searchPattern);
	}

	if (conditions.length > 0) {
		const whereClause = ' WHERE ' + conditions.join(' AND ');
		query += whereClause;
		countQuery += whereClause;
	}

	query += ` ORDER BY r.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
	const countParams = params;

	try {
		const countRow = await db.get(countQuery, countParams);
		const total = countRow?.count || 0;

		const rows = await db.all(query, params);

		res.json({
			list: rows || [],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏌ヨ澶辫触' });
	}
});

/**
 * 鑾峰彇鍏瓧璁板綍璇︽儏
 */
router.get('/records/:id', adminMiddleware, async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勮褰旾D' });
	}

	try {
		const row = await db.get(
			`SELECT 
				r.id, 
				r.name, 
				r.gender, 
				r.birth_datetime AS birthDatetime,
				r.calendar_type AS calendarType,
				r.raw_payload AS rawPayload,
				r.created_at AS createdAt,
				u.id AS userId,
				u.email AS userEmail,
				u.username AS userUsername
			FROM bazi_records r
			LEFT JOIN users u ON r.user_id = u.id
			WHERE r.id = ?`,
			[id]
		);

		if (!row) {
			return res.status(404).json({ error: '请求失败' });
		}

		let parsedPayload = null;
		if (row.rawPayload) {
			try {
				if (typeof row.rawPayload === 'string') {
					parsedPayload = JSON.parse(row.rawPayload);
				} else {
					parsedPayload = row.rawPayload;
				}
			} catch (e) {
				console.error('Admin route error');
				parsedPayload = row.rawPayload;
			}
		}

		res.json({
			id: row.id,
			name: row.name,
			gender: row.gender,
			birthDatetime: row.birthDatetime,
			calendarType: row.calendarType,
			createdAt: row.createdAt,
			userId: row.userId,
			userEmail: row.userEmail,
			userUsername: row.userUsername,
			rawPayload: parsedPayload,
		});
	} catch (err) {
		console.error('Admin route error');
		if (err.code === 'ER_MALFORMED_PACKET') {
			console.error('鏁版嵁鍖呴敊璇紝鍙兘鏄煡璇㈢粨鏋滆繃澶ф垨杩炴帴闂');
			return res.status(500).json({
				error: '鏌ヨ澶辫触锛氭暟鎹寘閿欒锛岃妫€鏌ユ暟鎹簱杩炴帴鎴栬仈绯荤鐞嗗憳',
			});
		}
		return res.status(500).json({ error: '鏌ヨ澶辫触' });
	}
});

/**
 * 鍒涘缓鍏瓧璁板綍
 */
router.post('/records', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { userId, name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};

	if (!userId || birthDatetime === null || birthDatetime === undefined || birthDatetime === '') {
		return res.status(400).json({ error: '缂哄皯 userId 鎴?birthDatetime' });
	}

	try {
		// 楠岃瘉鐢ㄦ埛鏄惁瀛樺湪
		const userRow = await db.get('SELECT id FROM users WHERE id = ?', [userId]);

		if (!userRow) {
			return res.status(404).json({ error: '请求失败' });
		}

		// 浣跨敤瀹夊叏宸ュ叿楠岃瘉鍜屾竻鐞嗚緭鍏?
		const sanitizedName = name
			? SecurityUtils.sanitizeString(String(name), { maxLength: 100 })
			: null;
		const validatedGender = SecurityUtils.validateGender(gender);
		const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);

		if (!validatedDateTime) {
			return res.status(400).json({ error: '请求失败' });
		}

		const sanitizedCalendarType = calendarType
			? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 })
			: null;

		// 瀹夊叏鍦板簭鍒楀寲 rawPayload
		let rawPayloadJson = null;
		if (rawPayload) {
			try {
				const payloadStr = JSON.stringify(rawPayload);
				if (payloadStr.length > 1000000) {
					return res.status(400).json({ error: '请求失败' });
				}
				rawPayloadJson = payloadStr;
			} catch (e) {
				console.error('Admin route error');
				return res.status(400).json({ error: '鏁版嵁鏍煎紡閿欒锛屾棤娉曚繚瀛? ' });
			}
		}

		const insertSql =
			'INSERT INTO bazi_records (user_id, name, gender, birth_datetime, calendar_type, raw_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';

		const result = await db.run(insertSql, [
			userId,
			sanitizedName,
			validatedGender,
			validatedDateTime,
			sanitizedCalendarType,
			rawPayloadJson,
		]);

		res.json({
			success: true,
			record: {
				id: result.lastID,
				userId,
				name: sanitizedName,
				gender: validatedGender,
				birthDatetime: validatedDateTime,
				calendarType: sanitizedCalendarType,
			},
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鍒涘缓澶辫触' });
	}
});

/**
 * 鏇存柊鍏瓧璁板綍
 */
router.put('/records/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const { userId, name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};

	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勮褰旾D' });
	}

	try {
		const recordRow = await db.get('SELECT id, user_id FROM bazi_records WHERE id = ?', [id]);

		if (!recordRow) {
			return res.status(404).json({ error: '请求失败' });
		}

		if (userId !== undefined && userId !== recordRow.user_id) {
			const userRow = await db.get('SELECT id FROM users WHERE id = ?', [userId]);

			if (!userRow) {
				return res.status(404).json({ error: '请求失败' });
			}
		}

		const updates = [];
		const params = [];

		if (userId !== undefined) {
			updates.push('user_id = ?');
			params.push(userId);
		}

		if (name !== undefined) {
			if (name === null || name === '') {
				updates.push('name = NULL');
			} else {
				updates.push('name = ?');
				params.push(SecurityUtils.sanitizeString(String(name), { maxLength: 100 }));
			}
		}

		if (gender !== undefined) {
			const validatedGender = SecurityUtils.validateGender(gender);
			updates.push('gender = ?');
			params.push(validatedGender);
		}

		if (birthDatetime !== undefined) {
			const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);
			if (!validatedDateTime) {
				return res.status(400).json({ error: '请求失败' });
			}
			updates.push('birth_datetime = ?');
			params.push(validatedDateTime);
		}

		if (calendarType !== undefined) {
			if (calendarType === null || calendarType === '') {
				updates.push('calendar_type = NULL');
			} else {
				updates.push('calendar_type = ?');
				params.push(SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 }));
			}
		}

		if (rawPayload !== undefined) {
			if (rawPayload === null) {
				updates.push('raw_payload = NULL');
			} else {
				try {
					const payloadStr = JSON.stringify(rawPayload);
					if (payloadStr.length > 1000000) {
						return res.status(400).json({ error: '请求失败' });
					}
					updates.push('raw_payload = ?');
					params.push(payloadStr);
				} catch (e) {
					return res.status(400).json({ error: '鏁版嵁鏍煎紡閿欒: ' });
				}
			}
		}

		if (updates.length === 0) {
			return res.status(400).json({ error: '娌℃湁瑕佹洿鏂扮殑瀛楁' });
		}

		params.push(id);
		const updateQuery = `UPDATE bazi_records SET ${updates.join(', ')} WHERE id = ?`;
		const result = await db.run(updateQuery, params);

		if (result.changes === 0) {
			return res.status(404).json({ error: '请求失败' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏇存柊澶辫触' });
	}
});

/**
 * 鍒犻櫎鍏瓧璁板綍
 */
router.delete('/records/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勮褰旾D' });
	}

	try {
		const result = await db.run('DELETE FROM bazi_records WHERE id = ?', [id]);
		if (result.changes === 0) {
			return res.status(404).json({ error: '请求失败' });
		}
		res.json({ success: true });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鍒犻櫎澶辫触' });
	}
});

/**
 * 鑾峰彇鍏埢璁板綍鍒楄〃
 */
router.get('/liuyao-records', adminMiddleware, async (req, res) => {
	const page = Math.max(1, parseInt(req.query.page) || 1);
	const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 20));
	const offset = (page - 1) * pageSize;
	const userId = req.query.userId ? parseInt(req.query.userId) : null;
	const search = req.query.search || '';

	let query = `
		SELECT 
			r.id, 
			r.name, 
			r.gender, 
			r.birth_datetime AS birthDatetime, 
			r.calendar_type AS calendarType,
			r.created_at AS createdAt,
			u.id AS userId,
			u.email AS userEmail,
			u.username AS userUsername
		FROM liuyao_records r
		LEFT JOIN users u ON r.user_id = u.id
	`;
	let countQuery = 'SELECT COUNT(*) as count FROM liuyao_records r';
	const params = [];
	const conditions = [];

	if (userId) {
		conditions.push('r.user_id = ?');
		params.push(userId);
	}

	if (search) {
		conditions.push('(r.name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)');
		const searchPattern = `%${search}%`;
		params.push(searchPattern, searchPattern, searchPattern);
	}

	if (conditions.length > 0) {
		const whereClause = ' WHERE ' + conditions.join(' AND ');
		query += whereClause;
		countQuery += whereClause;
	}

	query += ` ORDER BY r.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
	const countParams = params;

	try {
		const countRow = await db.get(countQuery, countParams);
		const total = countRow?.count || 0;

		const rows = await db.all(query, params);

		res.json({
			list: rows || [],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏌ヨ澶辫触' });
	}
});

/**
 * 鑾峰彇鍏埢璁板綍璇︽儏
 */
router.get('/liuyao-records/:id', adminMiddleware, async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勮褰旾D' });
	}

	try {
		const row = await db.get(
			`SELECT 
				r.id, 
				r.name, 
				r.gender, 
				r.birth_datetime AS birthDatetime,
				r.calendar_type AS calendarType,
				r.raw_payload AS rawPayload,
				r.created_at AS createdAt,
				u.id AS userId,
				u.email AS userEmail,
				u.username AS userUsername
			FROM liuyao_records r
			LEFT JOIN users u ON r.user_id = u.id
			WHERE r.id = ?`,
			[id]
		);

		if (!row) {
			return res.status(404).json({ error: '请求失败' });
		}

		let parsedPayload = null;
		if (row.rawPayload) {
			try {
				if (typeof row.rawPayload === 'string') {
					parsedPayload = JSON.parse(row.rawPayload);
				} else {
					parsedPayload = row.rawPayload;
				}
			} catch (e) {
				console.error('Admin route error');
				parsedPayload = row.rawPayload;
			}
		}

		res.json({
			id: row.id,
			name: row.name,
			gender: row.gender,
			birthDatetime: row.birthDatetime,
			calendarType: row.calendarType,
			createdAt: row.createdAt,
			userId: row.userId,
			userEmail: row.userEmail,
			userUsername: row.userUsername,
			rawPayload: parsedPayload,
		});
	} catch (err) {
		console.error('Admin route error');
		if (err.code === 'ER_MALFORMED_PACKET') {
			console.error('鏁版嵁鍖呴敊璇紝鍙兘鏄煡璇㈢粨鏋滆繃澶ф垨杩炴帴闂');
			return res.status(500).json({
				error: '鏌ヨ澶辫触锛氭暟鎹寘閿欒锛岃妫€鏌ユ暟鎹簱杩炴帴鎴栬仈绯荤鐞嗗憳',
			});
		}
		return res.status(500).json({ error: '鏌ヨ澶辫触' });
	}
});

/**
 * 鍒涘缓鍏埢璁板綍
 */
router.post('/liuyao-records', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { userId, name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};

	if (!userId || birthDatetime === null || birthDatetime === undefined || birthDatetime === '') {
		return res.status(400).json({ error: '缂哄皯 userId 鎴?birthDatetime' });
	}

	try {
		// 楠岃瘉鐢ㄦ埛鏄惁瀛樺湪
		const userRow = await db.get('SELECT id FROM users WHERE id = ?', [userId]);

		if (!userRow) {
			return res.status(404).json({ error: '请求失败' });
		}

		// 浣跨敤瀹夊叏宸ュ叿楠岃瘉鍜屾竻鐞嗚緭鍏?
		const sanitizedName = name
			? SecurityUtils.sanitizeString(String(name), { maxLength: 100 })
			: null;
		const validatedGender = SecurityUtils.validateGender(gender);
		const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);

		if (!validatedDateTime) {
			return res.status(400).json({ error: '请求失败' });
		}

		const sanitizedCalendarType = calendarType
			? SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 })
			: null;

		// 瀹夊叏鍦板簭鍒楀寲 rawPayload
		let rawPayloadJson = null;
		if (rawPayload) {
			try {
				const payloadStr = JSON.stringify(rawPayload);
				if (payloadStr.length > 1000000) {
					return res.status(400).json({ error: '请求失败' });
				}
				rawPayloadJson = payloadStr;
			} catch (e) {
				console.error('Admin route error');
				return res.status(400).json({ error: '鏁版嵁鏍煎紡閿欒锛屾棤娉曚繚瀛? ' });
			}
		}

		const insertSql =
			'INSERT INTO liuyao_records (user_id, name, gender, birth_datetime, calendar_type, raw_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';

		const result = await db.run(insertSql, [
			userId,
			sanitizedName,
			validatedGender,
			validatedDateTime,
			sanitizedCalendarType,
			rawPayloadJson,
		]);

		res.json({
			success: true,
			record: {
				id: result.lastID,
				userId,
				name: sanitizedName,
				gender: validatedGender,
				birthDatetime: validatedDateTime,
				calendarType: sanitizedCalendarType,
			},
		});
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鍒涘缓澶辫触' });
	}
});

/**
 * 鏇存柊鍏埢璁板綍
 */
router.put('/liuyao-records/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	const { userId, name, gender, birthDatetime, calendarType, rawPayload } = req.body || {};

	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勮褰旾D' });
	}

	try {
		const recordRow = await db.get('SELECT id, user_id FROM liuyao_records WHERE id = ?', [id]);

		if (!recordRow) {
			return res.status(404).json({ error: '请求失败' });
		}

		if (userId !== undefined && userId !== recordRow.user_id) {
			const userRow = await db.get('SELECT id FROM users WHERE id = ?', [userId]);

			if (!userRow) {
				return res.status(404).json({ error: '请求失败' });
			}
		}

		const updates = [];
		const params = [];

		if (userId !== undefined) {
			updates.push('user_id = ?');
			params.push(userId);
		}

		if (name !== undefined) {
			if (name === null || name === '') {
				updates.push('name = NULL');
			} else {
				updates.push('name = ?');
				params.push(SecurityUtils.sanitizeString(String(name), { maxLength: 100 }));
			}
		}

		if (gender !== undefined) {
			const validatedGender = SecurityUtils.validateGender(gender);
			updates.push('gender = ?');
			params.push(validatedGender);
		}

		if (birthDatetime !== undefined) {
			const validatedDateTime = SecurityUtils.validateDateTime(birthDatetime);
			if (!validatedDateTime) {
				return res.status(400).json({ error: '请求失败' });
			}
			updates.push('birth_datetime = ?');
			params.push(validatedDateTime);
		}

		if (calendarType !== undefined) {
			if (calendarType === null || calendarType === '') {
				updates.push('calendar_type = NULL');
			} else {
				updates.push('calendar_type = ?');
				params.push(SecurityUtils.sanitizeString(String(calendarType), { maxLength: 20 }));
			}
		}

		if (rawPayload !== undefined) {
			if (rawPayload === null) {
				updates.push('raw_payload = NULL');
			} else {
				try {
					const payloadStr = JSON.stringify(rawPayload);
					if (payloadStr.length > 1000000) {
						return res.status(400).json({ error: '请求失败' });
					}
					updates.push('raw_payload = ?');
					params.push(payloadStr);
				} catch (e) {
					return res.status(400).json({ error: '鏁版嵁鏍煎紡閿欒: ' });
				}
			}
		}

		if (updates.length === 0) {
			return res.status(400).json({ error: '娌℃湁瑕佹洿鏂扮殑瀛楁' });
		}

		params.push(id);
		const updateQuery = `UPDATE liuyao_records SET ${updates.join(', ')} WHERE id = ?`;
		const result = await db.run(updateQuery, params);

		if (result.changes === 0) {
			return res.status(404).json({ error: '请求失败' });
		}

		res.json({ success: true });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鏇存柊澶辫触' });
	}
});

/**
 * 鍒犻櫎鍏埢璁板綍
 */
router.delete('/liuyao-records/:id', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const id = SecurityUtils.validateId(req.params.id);
	if (!id) {
		return res.status(400).json({ error: '鏃犳晥鐨勮褰旾D' });
	}

	try {
		const result = await db.run('DELETE FROM liuyao_records WHERE id = ?', [id]);
		if (result.changes === 0) {
			return res.status(404).json({ error: '请求失败' });
		}
		res.json({ success: true });
	} catch (err) {
		console.error('Admin route error');
		return res.status(500).json({ error: '鍒犻櫎澶辫触' });
	}
});

/**
 * 鑾峰彇棰濆害閲嶇疆閰嶇疆
 */
router.get('/quota-reset-config', adminMiddleware, async (req, res) => {
	try {
		const config = await ConfigService.getQuotaResetConfig(db);
		res.json(config);
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鑾峰彇閰嶇疆澶辫触' });
	}
});

/**
 * 鏇存柊棰濆害閲嶇疆閰嶇疆
 */
router.post('/quota-reset-config', adminMiddleware, apiSignatureMiddleware(), async (req, res) => {
	const { enabled, time, timezone, target } = req.body || {};

	try {
		const enabledNormalized =
			enabled === undefined ? true : enabled === true || enabled === 'true' || enabled === 1 || enabled === '1';

		await ConfigService.setQuotaResetConfig(db, {
			enabled: enabledNormalized,
			time: time,
			timezone: timezone,
			target: target
		});

		// 閲嶆柊鍔犺浇瀹氭椂浠诲姟
		await reloadScheduler();

		res.json({ success: true, message: '閰嶇疆宸蹭繚瀛樺苟鐢熸晥' });
	} catch (e) {
		console.error('Admin route error');
		res.status(500).json({ error: '鏇存柊閰嶇疆澶辫触' });
	}
});

module.exports = router;






