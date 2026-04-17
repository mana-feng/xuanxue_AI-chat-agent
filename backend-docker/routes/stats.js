const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const IP_ENCRYPTION_SECRET = String(process.env.ANALYTICS_IP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'analytics-ip-secret');

const SESSION_TIMEOUT_MINUTES = 30;

function resolveGeoFromIP(ip) {
	if (!ip || ip === '' || ip === '::1' || ip === '127.0.0.1') return { country: '', region: '', city: '', isp: '' };
	const result = { country: 'Unknown', region: '', city: '', isp: '' };
	try {
		if (ip.includes(':')) { result.country = 'Unknown'; result.isp = 'IPv6'; return result; }
		const parts = ip.split('.');
		if (parts.length !== 4) return result;
		const num = (parseInt(parts[0]) << 24) | (parseInt(parts[1]) << 16) | (parseInt(parts[2]) << 8) | parseInt(parts[3]);
		const cnRanges = [
			{ s: 16777216, e: 17091711, name: 'China Telecom' },
			{ s: 17176688, e: 17213183, name: 'China Unicom' },
			{ s: 17367040, e: 17825791, name: 'China Mobile' },
			{ s: 18119392, e: 18350079, name: 'China Telecom' },
			{ s: 18454937, e: 18874367, name: 'China Unicom' },
			{ s: 19036160, e: 19217279, name: 'China Mobile' },
			{ s: 19581696, e: 19922943, name: 'China Telecom' },
			{ s: 20017408, e: 20132659, name: 'China Unicom' },
			{ s: 20237568, e: 20971519, name: 'China Mobile' },
			{ s: 20971520, e: 2130706431, name: 'China' },
		];
		for (const range of cnRanges) {
			if (num >= range.s && num <= range.e) {
				result.isp = range.name;
				result.country = 'China';
				break;
			}
		}
		if (!result.isp && num >= 281470681743360 && num <= 281474976710655) {
			result.isp = 'Localhost';
			result.country = '';
		} else if (!result.isp) {
			const usRanges = [
				{ s: 50331648, e: 805306367, name: 'US ISP' },
				{ s: 1342177280, e: 1610612735, name: 'US ISP' },
				{ s: 1698693120, e: 1879048191, name: 'US ISP' },
				{ s: 2130706432, e: 2147483647, name: 'US ISP' },
				{ s: 2155872256, e: 2181038079, name: 'US ISP' },
				{ s: 2202009600, e: 2222993407, name: 'US ISP' },
			];
			for (const range of usRanges) {
				if (num >= range.s && num <= range.e) {
					result.isp = range.name;
					result.country = 'United States';
					break;
				}
			}
		}
		if (!result.isp) {
			result.isp = 'Other';
		}
		if (result.country === 'China') {
			const regionMap = {
				'China Telecom': ['Beijing', 'Shanghai', 'Guangdong'],
				'China Unicom': ['Beijing', 'Shanghai', 'Guangdong'],
				'China Mobile': ['Beijing', 'Shanghai', 'Guangdong'],
			};
			const regions = regionMap[result.isp] || [];
			result.region = regions[Math.floor(num % regions.length)] || '';
			result.city = regions[Math.floor((num * 7) % regions.length)] || '';
		}
	} catch (e) {
		// ignore parsing errors
	}
	return result;
}

async function checkIsNewVisitor(db, visitorId, pvid) {
	if (!visitorId && !pvid) return true;
	try {
		const row = visitorId
			? await db.get('SELECT visitor_id FROM analytics_visitors WHERE visitor_id = ? LIMIT 1', [visitorId])
			: null;
		if (row) return false;
		if (!pvid) return true;
		const legacyRow = await db.get(`SELECT COUNT(*) as cnt FROM page_stats WHERE pvid = ?`, [pvid]);
		return !legacyRow || legacyRow.cnt === 0;
	} catch (e) {
		return true;
	}
}

function normalizeTimestamp(value) {
	const date = value ? new Date(value) : new Date();
	if (Number.isNaN(date.getTime())) {
		return new Date();
	}
	return date;
}

function formatDateTime(date) {
	return date.toISOString().slice(0, 19).replace('T', ' ');
}

function buildVisitorId(pvid, userAgent, ip) {
	const raw = `${pvid || ''}|${userAgent || ''}|${ip || ''}`;
	return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 40);
}

function hashIp(ip) {
	return crypto.createHash('sha256').update(String(ip || '')).digest('hex');
}

function buildEncryptionKey() {
	return crypto.createHash('sha256').update(IP_ENCRYPTION_SECRET).digest();
}

function encryptIp(ip) {
	const value = String(ip || '').trim();
	if (!value) return '';
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', buildEncryptionKey(), iv);
	const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptIp(payload) {
	const value = String(payload || '').trim();
	if (!value) return '';
	const parts = value.split(':');
	if (parts.length !== 3) {
		return value;
	}
	try {
		const decipher = crypto.createDecipheriv(
			'aes-256-gcm',
			buildEncryptionKey(),
			Buffer.from(parts[0], 'hex')
		);
		decipher.setAuthTag(Buffer.from(parts[1], 'hex'));
		const decrypted = Buffer.concat([
			decipher.update(Buffer.from(parts[2], 'hex')),
			decipher.final(),
		]);
		return decrypted.toString('utf8');
	} catch (e) {
		return '';
	}
}

function buildIpStorage(ip) {
	const raw = String(ip || '').trim();
	return {
		ip: raw,
		ipHash: raw ? hashIp(raw) : '',
		ipEncrypted: raw ? encryptIp(raw) : '',
	};
}

async function getSessionPageCount(db, sessionId) {
	if (!sessionId) return 0;
	try {
		const row = await db.get('SELECT COUNT(*) AS cnt FROM page_stats WHERE session_id = ?', [sessionId]);
		return Number(row?.cnt || 0);
	} catch (e) {
		return 0;
	}
}

async function upsertVisitor(db, payload) {
	const existing = await db.get(
		'SELECT visitor_id, visit_count, session_count, pageview_count, first_seen_at FROM analytics_visitors WHERE visitor_id = ? LIMIT 1',
		[payload.visitorId]
	);
	if (!existing) {
		await db.run(
			`INSERT INTO analytics_visitors (
				visitor_id, pvid, first_seen_at, last_seen_at, first_page_url, last_page_url,
				entry_pathname, last_pathname, referrer, referrer_type, search_engine, search_keyword,
				utm_source, utm_medium, utm_campaign, utm_term, utm_content, ip, ip_hash, ip_encrypted, country, region,
				city, isp, language, timezone, user_agent, device_type, browser, browser_version,
				os, os_version, visit_count, session_count, pageview_count, created_at, updated_at
			) VALUES (
				?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
			)`,
			[
				payload.visitorId,
				payload.pvid,
				payload.occurredAt,
				payload.occurredAt,
				payload.url,
				payload.url,
				payload.pathname,
				payload.pathname,
				payload.referrer,
				payload.referrerType,
				payload.searchEngine,
				payload.searchKeyword,
				payload.utmSource,
				payload.utmMedium,
				payload.utmCampaign,
				payload.utmTerm,
				payload.utmContent,
				payload.ip,
				payload.ipHash,
				payload.ipEncrypted,
				payload.country,
				payload.region,
				payload.city,
				payload.isp,
				payload.language,
				payload.timezone,
				payload.userAgent,
				payload.deviceType,
				payload.browser,
				payload.browserVersion,
				payload.os,
				payload.osVersion,
				1,
				payload.isNewSession ? 1 : 0,
				1,
				payload.occurredAt,
				payload.occurredAt,
			]
		);
		return { isNewVisitor: true, visitSequence: 1 };
	}

	const visitSequence = Number(existing.pageview_count || 0) + 1;
	await db.run(
		`UPDATE analytics_visitors SET
			pvid = ?,
			last_seen_at = ?,
			last_page_url = ?,
			last_pathname = ?,
			referrer = ?,
			referrer_type = ?,
			search_engine = ?,
			search_keyword = ?,
			utm_source = ?,
			utm_medium = ?,
			utm_campaign = ?,
			utm_term = ?,
			utm_content = ?,
			ip = ?,
			ip_hash = ?,
			ip_encrypted = ?,
			country = ?,
			region = ?,
			city = ?,
			isp = ?,
			language = ?,
			timezone = ?,
			user_agent = ?,
			device_type = ?,
			browser = ?,
			browser_version = ?,
			os = ?,
			os_version = ?,
			visit_count = visit_count + 1,
			session_count = session_count + ?,
			pageview_count = pageview_count + 1,
			updated_at = NOW()
		WHERE visitor_id = ?`,
		[
			payload.pvid,
			payload.occurredAt,
			payload.url,
			payload.pathname,
			payload.referrer,
			payload.referrerType,
			payload.searchEngine,
			payload.searchKeyword,
			payload.utmSource,
			payload.utmMedium,
			payload.utmCampaign,
			payload.utmTerm,
			payload.utmContent,
			payload.ip,
			payload.ipHash,
			payload.ipEncrypted,
			payload.country,
			payload.region,
			payload.city,
			payload.isp,
			payload.language,
			payload.timezone,
			payload.userAgent,
			payload.deviceType,
			payload.browser,
			payload.browserVersion,
			payload.os,
			payload.osVersion,
			payload.isNewSession ? 1 : 0,
			payload.visitorId,
		]
	);
	return { isNewVisitor: false, visitSequence };
}

async function upsertSession(db, payload) {
	const existing = await db.get(
		'SELECT session_id, started_at, pageview_count, entry_page_id, last_pageview_id FROM analytics_sessions WHERE session_id = ? LIMIT 1',
		[payload.sessionId]
	);
	if (!existing) {
		await db.run(
			`INSERT INTO analytics_sessions (
				session_id, visitor_id, pvid, started_at, last_activity_at, ended_at,
				landing_page_url, landing_pathname, exit_page_url, exit_pathname, referrer,
				referrer_type, search_engine, search_keyword, utm_source, utm_medium,
				utm_campaign, utm_term, utm_content, ip, ip_hash, ip_encrypted, country, region, city, isp,
				language, timezone, device_type, browser, browser_version, os, os_version,
				entry_page_id, last_pageview_id, pageview_count, duration_seconds, is_bounce, created_at, updated_at
			) VALUES (
				?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
			)`,
			[
				payload.sessionId,
				payload.visitorId,
				payload.pvid,
				payload.occurredAt,
				payload.occurredAt,
				payload.occurredAt,
				payload.url,
				payload.pathname,
				payload.url,
				payload.pathname,
				payload.referrer,
				payload.referrerType,
				payload.searchEngine,
				payload.searchKeyword,
				payload.utmSource,
				payload.utmMedium,
				payload.utmCampaign,
				payload.utmTerm,
				payload.utmContent,
				payload.ip,
				payload.ipHash,
				payload.ipEncrypted,
				payload.country,
				payload.region,
				payload.city,
				payload.isp,
				payload.language,
				payload.timezone,
				payload.deviceType,
				payload.browser,
				payload.browserVersion,
				payload.os,
				payload.osVersion,
				null,
				null,
				1,
				payload.sessionDuration,
				1,
				payload.occurredAt,
				payload.occurredAt,
			]
		);
		return { isNewSession: true, sessionPageIndex: 1 };
	}

	const sessionPageIndex = Number(existing.pageview_count || 0) + 1;
	await db.run(
		`UPDATE analytics_sessions SET
			visitor_id = ?,
			pvid = ?,
			last_activity_at = ?,
			ended_at = ?,
			exit_page_url = ?,
			exit_pathname = ?,
			referrer = ?,
			referrer_type = ?,
			search_engine = ?,
			search_keyword = ?,
			utm_source = ?,
			utm_medium = ?,
			utm_campaign = ?,
			utm_term = ?,
			utm_content = ?,
			ip = ?,
			ip_hash = ?,
			ip_encrypted = ?,
			country = ?,
			region = ?,
			city = ?,
			isp = ?,
			language = ?,
			timezone = ?,
			device_type = ?,
			browser = ?,
			browser_version = ?,
			os = ?,
			os_version = ?,
			pageview_count = pageview_count + 1,
			duration_seconds = ?,
			is_bounce = ?,
			updated_at = NOW()
		WHERE session_id = ?`,
		[
			payload.visitorId,
			payload.pvid,
			payload.occurredAt,
			payload.occurredAt,
			payload.url,
			payload.pathname,
			payload.referrer,
			payload.referrerType,
			payload.searchEngine,
			payload.searchKeyword,
			payload.utmSource,
			payload.utmMedium,
			payload.utmCampaign,
			payload.utmTerm,
			payload.utmContent,
			payload.ip,
			payload.ipHash,
			payload.ipEncrypted,
			payload.country,
			payload.region,
			payload.city,
			payload.isp,
			payload.language,
			payload.timezone,
			payload.deviceType,
			payload.browser,
			payload.browserVersion,
			payload.os,
			payload.osVersion,
			payload.sessionDuration,
			sessionPageIndex > 1 ? 0 : 1,
			payload.sessionId,
		]
	);
	return { isNewSession: false, sessionPageIndex };
}

async function attachSessionPageview(db, sessionId, pageviewId, isNewSession) {
	if (!sessionId || !pageviewId) return;
	if (isNewSession) {
		await db.run(
			'UPDATE analytics_sessions SET entry_page_id = ?, last_pageview_id = ?, updated_at = NOW() WHERE session_id = ?',
			[pageviewId, pageviewId, sessionId]
		);
		return;
	}
	await db.run(
		'UPDATE analytics_sessions SET last_pageview_id = ?, updated_at = NOW() WHERE session_id = ?',
		[pageviewId, sessionId]
	);
}

router.post('/pageview', async (req, res) => {
	let db;
	try {
		db = require('../db').getDatabase();
	} catch (e) {
		console.log('[Stats] DB init failed, skipping:', e.message);
		return res.json({ success: true, skipped: true });
	}

	try {
		const body = req.body || {};
		console.log('[Stats] Received pageview:', {
			url: body.url,
			title: body.title,
			timestamp: body.timestamp,
			isLoggedIn: body.isLoggedIn,
			username: body.username,
		});
		const {
			url,
			referrer,
			title,
			userAgent,
			screenWidth,
			screenHeight,
			viewportWidth,
			viewportHeight,
			deviceType,
			browser,
			browserVersion,
			os,
			osVersion,
			language,
			charset,
			colorDepth,
			pixelRatio,
			touchSupport,
			connectionType,
			downlinkSpeed,
			timezone,
			loadTime,
			domContentLoadedTime,
			fcpTime,
			isEntryPage,
			utmSource,
			utmMedium,
			utmCampaign,
			utmTerm,
			utmContent,
			referrerType,
			searchEngine,
			searchKeyword,
			sessionId,
			pvid,
			sessionDuration,
			timestamp,
			isLoggedIn,
			username,
		} = body;

		if (!url || !timestamp) {
			return res.status(400).json({ success: false, error: '缺少必要参数' });
		}

		const parsedUrl = new URL(url);
		const pathname = parsedUrl.pathname || '/';
		const queryString = parsedUrl.search || '';
		const ip = req.ip || req.connection?.remoteAddress || '';
		const ipStorage = buildIpStorage(ip);
		const userAgentStr = userAgent || '';
		const isMobile = deviceType === 'mobile';
		const date = normalizeTimestamp(timestamp);
		const dateTime = formatDateTime(date);
		const hour = date.getHours();
		const dayOfWeek = date.getDay();
		const dateStr = date.toISOString().split('T')[0];
		const visitorId = buildVisitorId(pvid, userAgentStr, ip);

		const geo = resolveGeoFromIP(ip);
		const existingSession = sessionId
			? await db.get(
				'SELECT session_id FROM analytics_sessions WHERE session_id = ? AND last_activity_at >= DATE_SUB(?, INTERVAL ? MINUTE) LIMIT 1',
				[sessionId, dateTime, SESSION_TIMEOUT_MINUTES]
			)
			: null;
		const isNewSession = !existingSession;
		const isNewVisitor = await checkIsNewVisitor(db, visitorId, pvid);

		const visitorPayload = {
			visitorId,
			pvid: pvid || '',
			sessionId: sessionId || '',
			occurredAt: dateTime,
			url,
			pathname,
			referrer: referrer || '',
			referrerType: referrerType || '',
			searchEngine: searchEngine || '',
			searchKeyword: searchKeyword || '',
			utmSource: utmSource || '',
			utmMedium: utmMedium || '',
			utmCampaign: utmCampaign || '',
			utmTerm: utmTerm || '',
			utmContent: utmContent || '',
			ip: ipStorage.ip,
			ipHash: ipStorage.ipHash,
			ipEncrypted: ipStorage.ipEncrypted,
			country: geo.country,
			region: geo.region,
			city: geo.city,
			isp: geo.isp,
			language: language || '',
			timezone: timezone || '',
			userAgent: userAgentStr,
			deviceType: deviceType || 'desktop',
			browser: browser || '',
			browserVersion: browserVersion || '',
			os: os || '',
			osVersion: osVersion || '',
			sessionDuration: sessionDuration || 0,
			isNewSession,
		};

		const visitorState = await upsertVisitor(db, visitorPayload);
		const sessionState = await upsertSession(db, visitorPayload);

		const valueMap = {
			visitor_id: visitorId,
			pvid: pvid || '',
			session_id: sessionId || '',
			url,
			pathname,
			query_string: queryString,
			referrer: referrer || '',
			title: title || '',
			user_agent: userAgentStr,
			screen_width: screenWidth || 0,
			screen_height: screenHeight || 0,
			viewport_width: viewportWidth || 0,
			viewport_height: viewportHeight || 0,
			device_type: deviceType || 'desktop',
			is_mobile: isMobile ? 1 : 0,
			browser: browser || '',
			browser_version: browserVersion || '',
			os: os || '',
			os_version: osVersion || '',
			language: language || '',
			charset: charset || 'UTF-8',
			color_depth: colorDepth || 24,
			pixel_ratio: pixelRatio || 1,
			touch_support: touchSupport ? 1 : 0,
			connection_type: connectionType || '',
			downlink_speed: downlinkSpeed || 0,
			ip: ipStorage.ip,
			ip_hash: ipStorage.ipHash,
			ip_encrypted: ipStorage.ipEncrypted,
			timezone: timezone || '',
			load_time: loadTime || 0,
			dom_content_loaded_time: domContentLoadedTime || 0,
			fcp_time: fcpTime || 0,
			is_entry_page: isEntryPage ? 1 : 0,
			utm_source: utmSource || '',
			utm_medium: utmMedium || '',
			utm_campaign: utmCampaign || '',
			utm_term: utmTerm || '',
			utm_content: utmContent || '',
			referrer_type: referrerType || '',
			search_engine: searchEngine || '',
			search_keyword: searchKeyword || '',
			country: geo.country,
			region: geo.region,
			city: geo.city,
			isp: geo.isp,
			is_new_visitor: isNewVisitor ? 1 : 0,
			session_duration: sessionDuration || 0,
			visit_hour: hour,
			day_of_week: dayOfWeek,
			visit_date: dateStr,
			visit_sequence: visitorState.visitSequence,
			session_page_index: sessionState.sessionPageIndex,
			session_started_at: dateTime,
			last_activity_at: dateTime,
			is_logged_in: isLoggedIn ? 1 : 0,
			username: username || null,
		};

		let tableColumns;
		try {
			const colRows = await db.all(
				"SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'page_stats'"
			);
			tableColumns = new Set((colRows || []).map((r) => r.COLUMN_NAME));
		} catch (e) {
			tableColumns = new Set(Object.keys(valueMap));
		}

		tableColumns.delete('id');
		tableColumns.delete('created_at');

		const insertCols = [];
		const insertVals = [];
		const placeholders = [];
		for (const [col, val] of Object.entries(valueMap)) {
			if (tableColumns.has(col)) {
				insertCols.push(col);
				insertVals.push(val);
				placeholders.push('?');
			}
		}

		insertCols.push('created_at');
		placeholders.push('NOW()');

		if (insertCols.length < 2) {
			return res.json({ success: true, skipped: true });
		}

		const insertResult = await db.run(
			`INSERT INTO page_stats (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`,
			insertVals
		);
		console.log('[Stats] Pageview saved successfully, insertId:', insertResult?.lastID);
		await attachSessionPageview(db, sessionId || '', insertResult?.lastID, sessionState.isNewSession);

		res.json({ success: true, visitorId, sessionId: sessionId || '' });
	} catch (err) {
		console.error('Pageview stats error:', err.message);
		console.error('Stack:', err.stack);
		res.status(500).json({ success: false, error: '统计记录失败' });
	}
});

module.exports = router;
