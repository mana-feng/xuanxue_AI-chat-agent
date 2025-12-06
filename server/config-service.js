/**
 * 配置服务
 * 使用明文存储配置数据
 */

const TABLE_NAME = 'app_config';

/**
 * 初始化配置表
 */
async function initTable(db) {
	await db.run(
		`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
			\`key\` VARCHAR(100) NOT NULL PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at DATETIME DEFAULT NULL
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);
}

/**
 * 设置配置项
 * @param {Object} db - 数据库实例
 * @param {string} key - 配置键
 * @param {string} value - 配置值（明文存储）
 */
async function setConfig(db, key, value) {
	if (!key || typeof key !== 'string') {
		throw new Error('配置键不能为空');
	}
	
	await db.run(
		`INSERT INTO ${TABLE_NAME} (\`key\`, value, updated_at) VALUES (?, ?, NOW())
		 ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
		[key, String(value)]
	);
}

/**
 * 获取配置项
 * @param {Object} db - 数据库实例
 * @param {string} key - 配置键
 * @returns {string|null} 配置值或 null
 */
async function getConfig(db, key) {
	if (!key || typeof key !== 'string') {
		return null;
	}
	
	const row = await db.get(
		`SELECT value FROM ${TABLE_NAME} WHERE \`key\` = ?`,
		[key]
	);
	
	if (!row || !row.value) {
		return null;
	}
	
	return String(row.value);
}

/**
 * 删除配置项
 * @param {Object} db - 数据库实例
 * @param {string} key - 配置键
 */
async function deleteConfig(db, key) {
	if (!key || typeof key !== 'string') {
		return;
	}
	
	await db.run(`DELETE FROM ${TABLE_NAME} WHERE \`key\` = ?`, [key]);
}

/**
 * 批量删除配置项（按前缀）
 * @param {Object} db - 数据库实例
 * @param {string} prefix - 配置键前缀
 */
async function deleteConfigByPrefix(db, prefix) {
	if (!prefix || typeof prefix !== 'string') {
		return;
	}
	
	await db.run(`DELETE FROM ${TABLE_NAME} WHERE \`key\` LIKE ?`, [`${prefix}%`]);
}

/**
 * 获取邮箱配置
 * @param {Object} db - 数据库实例
 * @returns {Object} 邮箱配置对象
 */
async function getEmailConfig(db) {
	const config = {
		host: await getConfig(db, 'EMAIL_HOST'),
		port: await getConfig(db, 'EMAIL_PORT'),
		user: await getConfig(db, 'EMAIL_USER'),
		pass: await getConfig(db, 'EMAIL_PASS'),
		from: await getConfig(db, 'EMAIL_FROM'),
		fromName: await getConfig(db, 'EMAIL_FROM_NAME')
	};
	
	return {
		host: config.host || '',
		port: config.port ? Number(config.port) : 0,
		user: config.user || '',
		pass: config.pass || '',
		from: config.from || '',
		fromName: config.fromName || ''
	};
}

/**
 * 设置邮箱配置（批量）
 * @param {Object} db - 数据库实例
 * @param {Object} config - 邮箱配置对象
 * @param {string} config.host - SMTP 服务器地址
 * @param {number} config.port - SMTP 端口
 * @param {string} config.user - 邮箱账号
 * @param {string} [config.pass] - 邮箱密码（可选，不提供则不更新）
 * @param {string} config.from - 发件人邮箱
 * @param {string} [config.fromName] - 发件人名称（可选）
 */
async function setEmailConfig(db, config) {
	const { host, port, user, pass, from, fromName } = config || {};
	
	// 验证必填项
	if (!host || typeof host !== 'string' || !host.trim()) {
		throw new Error('SMTP 服务器地址不能为空');
	}
	if (!user || typeof user !== 'string' || !user.trim()) {
		throw new Error('邮箱账号不能为空');
	}
	if (!port || (typeof port !== 'number' && isNaN(Number(port)))) {
		throw new Error('端口号无效');
	}
	if (!from || typeof from !== 'string' || !from.trim()) {
		throw new Error('发件人邮箱不能为空');
	}
	
	// 验证邮箱格式
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(from.trim())) {
		throw new Error('发件人邮箱格式不正确');
	}
	
	// 验证端口
	const portNum = Number(port);
	if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
		throw new Error('端口号无效（1-65535）');
	}
	
	// 保存配置（明文存储）
	await setConfig(db, 'EMAIL_HOST', String(host).trim());
	await setConfig(db, 'EMAIL_PORT', String(portNum));
	await setConfig(db, 'EMAIL_USER', String(user).trim());
	
	// 密码：如果提供则更新，否则不更新（保持原值）
	if (pass !== undefined && pass !== null && pass !== '') {
		await setConfig(db, 'EMAIL_PASS', String(pass));
	}
	// 如果 pass 为 undefined，说明不需要更新密码，跳过
	
	await setConfig(db, 'EMAIL_FROM', String(from).trim().toLowerCase());
	await setConfig(db, 'EMAIL_FROM_NAME', fromName ? String(fromName).trim() : '');
}

/**
 * 验证邮箱配置是否完整
 * @param {Object} db - 数据库实例
 * @returns {boolean} 配置是否完整
 */
async function isEmailConfigValid(db) {
	const config = await getEmailConfig(db);
	return Boolean(
		config.host &&
		config.port > 0 &&
		config.user &&
		config.pass &&
		config.from
	);
}

/**
 * 清理所有邮箱配置（用于重置）
 * @param {Object} db - 数据库实例
 */
async function clearEmailConfig(db) {
	const emailKeys = [
		'EMAIL_HOST',
		'EMAIL_PORT',
		'EMAIL_USER',
		'EMAIL_PASS',
		'EMAIL_FROM',
		'EMAIL_FROM_NAME'
	];
	
	for (const key of emailKeys) {
		await deleteConfig(db, key);
	}
}

module.exports = {
	initTable,
	getEmailConfig,
	setEmailConfig,
	getConfig,
	setConfig,
	deleteConfig,
	deleteConfigByPrefix,
	isEmailConfigValid,
	clearEmailConfig
};
