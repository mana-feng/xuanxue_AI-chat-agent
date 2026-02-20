/**
 * 配置服务
 * 使用明文存储配置数据
 */

const TABLE_NAME = 'app_config';
const DEFAULT_ANALYTICS_SNIPPET = `<!-- Default Statcounter code for xuan -->
<script type="text/javascript">
var sc_project=13195480; 
var sc_invisible=1; 
var sc_security="98632ca4"; 
</script>
<script type="text/javascript"
src="https://www.statcounter.com/counter/counter.js"
async></script>
<noscript><div class="statcounter"><a title="Web Analytics"
href="https://statcounter.com/" target="_blank"><img
class="statcounter"
src="https://c.statcounter.com/13195480/0/98632ca4/1/"
alt="Web Analytics"
referrerPolicy="no-referrer-when-downgrade"></a></div></noscript>
<!-- End of Statcounter Code -->`;

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

	const row = await db.get(`SELECT value FROM ${TABLE_NAME} WHERE \`key\` = ?`, [key]);

	if (!row || row.value === undefined || row.value === null) {
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

async function ensureEmailConfigsTable(db) {
	await db.run(
		`CREATE TABLE IF NOT EXISTS email_configs (
			id INT AUTO_INCREMENT PRIMARY KEY,
			host VARCHAR(200) NOT NULL,
			port INT NOT NULL,
			user VARCHAR(200) NOT NULL,
			pass TEXT NOT NULL,
			\`from\` VARCHAR(200) NOT NULL,
			from_name VARCHAR(200) DEFAULT NULL,
			is_active TINYINT(1) DEFAULT 0,
			created_at DATETIME DEFAULT NULL,
			updated_at DATETIME DEFAULT NULL,
			KEY idx_is_active (is_active)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
	);
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
		fromName: await getConfig(db, 'EMAIL_FROM_NAME'),
	};

	return {
		host: config.host || '',
		port: config.port ? Number(config.port) : 0,
		user: config.user || '',
		pass: config.pass || '',
		from: config.from || '',
		fromName: config.fromName || '',
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

	// 确保历史表存在
	await ensureEmailConfigsTable(db).catch(() => {
		// 表可能不存在或创建失败，继续主流程
	});

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

	// 记录历史并标记当前激活
	try {
		// 获取最终用于连接的密码（若未传入则读取已有配置）
		const finalPass =
			pass !== undefined && pass !== null && pass !== ''
				? String(pass)
				: await getConfig(db, 'EMAIL_PASS');

		// 关闭其他记录的激活状态
		await db.run('UPDATE email_configs SET is_active = 0 WHERE is_active = 1').catch(() => {});

		// 查找是否已有相同配置
		const existing = await db
			.get(
				`SELECT id FROM email_configs 
				WHERE host = ? AND port = ? AND user = ? AND \`from\` = ? AND COALESCE(from_name, '') = COALESCE(?, '')`,
				[
					String(host).trim(),
					portNum,
					String(user).trim(),
					String(from).trim().toLowerCase(),
					fromName ? String(fromName).trim() : '',
				]
			)
			.catch(() => null);

		if (existing && existing.id) {
			await db
				.run(
					`UPDATE email_configs 
					SET pass = ?, host = ?, port = ?, user = ?, \`from\` = ?, from_name = ?, is_active = 1, updated_at = NOW() 
					WHERE id = ?`,
					[
						finalPass || '',
						String(host).trim(),
						portNum,
						String(user).trim(),
						String(from).trim().toLowerCase(),
						fromName ? String(fromName).trim() : '',
						existing.id,
					]
				)
				.catch(() => {});
		} else {
			await db
				.run(
					`INSERT INTO email_configs (host, port, user, pass, \`from\`, from_name, is_active, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
					[
						String(host).trim(),
						portNum,
						String(user).trim(),
						finalPass || '',
						String(from).trim().toLowerCase(),
						fromName ? String(fromName).trim() : '',
					]
				)
				.catch(() => {});
		}
	} catch (e) {
		console.warn('记录邮箱配置历史失败:', e.message);
	}
}

/**
 * 验证邮箱配置是否完整
 * @param {Object} db - 数据库实例
 * @returns {boolean} 配置是否完整
 */
async function isEmailConfigValid(db) {
	const config = await getEmailConfig(db);
	return Boolean(config.host && config.port > 0 && config.user && config.pass && config.from);
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
		'EMAIL_FROM_NAME',
	];

	for (const key of emailKeys) {
		await deleteConfig(db, key);
	}
}

async function getEmailConfigs(db) {
	try {
		await ensureEmailConfigsTable(db);
		let rows = await db.all(
			`SELECT id, host, port, user, pass, \`from\`, from_name AS fromName, is_active, created_at, updated_at
			 FROM email_configs
			 ORDER BY created_at DESC`
		);
		if (!rows || rows.length === 0) {
			// 如果历史表为空，但 app_config 中已有有效配置，则补录一条作为当前记录
			const current = await getEmailConfig(db);
			const valid = await isEmailConfigValid(db);
			if (valid && current.host && current.user && current.pass && current.from) {
				await db
					.run(
						`INSERT INTO email_configs (host, port, user, pass, \`from\`, from_name, is_active, created_at, updated_at)
						 VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
						[
							current.host,
							current.port,
							current.user,
							current.pass,
							current.from,
							current.fromName || null,
						]
					)
					.catch(() => {});
				rows = await db.all(
					`SELECT id, host, port, user, pass, \`from\`, from_name AS fromName, is_active, created_at, updated_at
					 FROM email_configs
					 ORDER BY created_at DESC`
				);
			}
		}
		return rows || [];
	} catch (e) {
		if (e.code === 'ER_NO_SUCH_TABLE' || e.message?.includes("doesn't exist")) {
			console.warn('邮箱配置历史表不存在，返回空列表');
			return [];
		}
		throw e;
	}
}

async function activateEmailConfig(db, configId) {
	await ensureEmailConfigsTable(db);
	const cfg = await db.get('SELECT * FROM email_configs WHERE id = ?', [configId]);
	if (!cfg) {
		throw new Error('邮箱配置不存在');
	}
	await setEmailConfig(db, {
		host: cfg.host,
		port: cfg.port,
		user: cfg.user,
		pass: cfg.pass,
		from: cfg.from,
		fromName: cfg.from_name,
	});
}

async function deleteEmailConfig(db, configId) {
	await ensureEmailConfigsTable(db);
	const cfg = await db.get('SELECT is_active FROM email_configs WHERE id = ?', [configId]);
	if (!cfg) {
		throw new Error('邮箱配置不存在');
	}
	if (cfg.is_active) {
		throw new Error('无法删除当前使用的配置');
	}
	await db.run('DELETE FROM email_configs WHERE id = ?', [configId]);
}

async function getAnalyticsSnippet(db) {
	const saved = await getConfig(db, 'ANALYTICS_SNIPPET');
	if (saved !== null && saved !== undefined) {
		return String(saved);
	}
	return DEFAULT_ANALYTICS_SNIPPET;
}

async function setAnalyticsSnippet(db, snippet) {
	const value = snippet !== undefined && snippet !== null ? String(snippet) : '';
	await setConfig(db, 'ANALYTICS_SNIPPET', value);
}

// ===== 大模型配置 =====
async function getLLMConfig(db) {
	const config = {
		provider: await getConfig(db, 'LLM_PROVIDER'),
		baseUrl: await getConfig(db, 'LLM_BASE_URL'),
		apiKey: await getConfig(db, 'LLM_API_KEY'),
		model: await getConfig(db, 'LLM_MODEL'),
		extra: await getConfig(db, 'LLM_EXTRA'),
	};

	return {
		provider: config.provider || 'openai',
		baseUrl: config.baseUrl || '',
		apiKey: config.apiKey || '',
		model: config.model || '',
		extra: config.extra || '',
	};
}

async function setLLMConfig(db, config) {
	const { provider, baseUrl, apiKey, model, extra, name } = config || {};
	if (!provider || !baseUrl || !apiKey || !model) {
		throw new Error('provider、baseUrl、apiKey、model 不能为空');
	}
	await setConfig(db, 'LLM_PROVIDER', String(provider).trim());
	await setConfig(db, 'LLM_BASE_URL', String(baseUrl).trim());
	await setConfig(db, 'LLM_API_KEY', String(apiKey).trim());
	await setConfig(db, 'LLM_MODEL', String(model).trim());
	await setConfig(db, 'LLM_EXTRA', extra !== undefined && extra !== null ? String(extra) : '');

	// 保存到模型历史记录表（如果表存在）
	try {
		const modelName = name || `${provider}-${model}`;
		// 先取消其他模型的激活状态
		await db.run('UPDATE llm_models SET is_active = 0 WHERE is_active = 1').catch(() => {
			// 表可能不存在，忽略错误
		});
		// 检查是否已存在相同配置
		const existing = await db.get(
			'SELECT id FROM llm_models WHERE provider = ? AND base_url = ? AND api_key = ? AND model = ?',
			[provider, baseUrl, apiKey, model]
		).catch(() => null);
		
		if (existing) {
			// 更新现有记录并激活
			await db.run(
				'UPDATE llm_models SET name = ?, extra = ?, is_active = 1, updated_at = NOW() WHERE id = ?',
				[modelName, extra || null, existing.id]
			);
		} else {
			// 创建新记录并激活
			await db.run(
				`INSERT INTO llm_models (name, provider, base_url, api_key, model, extra, is_active, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
				[modelName, provider, baseUrl, apiKey, model, extra || null]
			);
		}
	} catch (e) {
		// 如果表不存在或其他错误，记录警告但不影响主流程
		console.warn('保存模型历史记录失败（表可能未创建）:', e.message);
	}
}

/**
 * 获取所有历史模型配置
 */
async function getLLMModels(db) {
	try {
		const rows = await db.all(
			'SELECT id, name, provider, base_url, api_key, model, extra, is_active, created_at, updated_at FROM llm_models ORDER BY created_at DESC'
		);
		return rows || [];
	} catch (e) {
		// 如果表不存在，返回空数组
		if (e.code === 'ER_NO_SUCH_TABLE' || e.message?.includes('doesn\'t exist')) {
			console.warn('模型历史表不存在，返回空列表');
			return [];
		}
		throw e;
	}
}

/**
 * 根据 ID 切换激活的模型配置
 */
async function activateLLMModel(db, modelId) {
	const model = await db.get('SELECT * FROM llm_models WHERE id = ?', [modelId]);
	if (!model) {
		throw new Error('模型配置不存在');
	}
	// 取消其他模型的激活状态
	await db.run('UPDATE llm_models SET is_active = 0 WHERE is_active = 1');
	// 激活指定模型
	await db.run('UPDATE llm_models SET is_active = 1, updated_at = NOW() WHERE id = ?', [modelId]);
	// 同步到 app_config
	await setLLMConfig(db, {
		provider: model.provider,
		baseUrl: model.base_url,
		apiKey: model.api_key,
		model: model.model,
		extra: model.extra || ''
	});
}

/**
 * 删除模型配置
 */
async function deleteLLMModel(db, modelId) {
	const model = await db.get('SELECT is_active FROM llm_models WHERE id = ?', [modelId]);
	if (!model) {
		throw new Error('模型配置不存在');
	}
	if (model.is_active) {
		throw new Error('无法删除当前正在使用的配置');
	}
	await db.run('DELETE FROM llm_models WHERE id = ?', [modelId]);
}

module.exports = {
	initTable,
	getEmailConfig,
	setEmailConfig,
	getLLMConfig,
	setLLMConfig,
	getLLMModels,
	activateLLMModel,
	deleteLLMModel,
	getConfig,
	setConfig,
	deleteConfig,
	deleteConfigByPrefix,
	isEmailConfigValid,
	clearEmailConfig,
	getEmailConfigs,
	activateEmailConfig,
	deleteEmailConfig,
	getAnalyticsSnippet,
	setAnalyticsSnippet,
	getQuotaResetConfig,
	setQuotaResetConfig,
};

// ===== 额度重置配置 =====
async function getQuotaResetConfig(db) {
	const enabled = await getConfig(db, 'QUOTA_RESET_ENABLED');
	const time = await getConfig(db, 'QUOTA_RESET_TIME');
	const timezone = await getConfig(db, 'QUOTA_RESET_TIMEZONE');
	const target = await getConfig(db, 'QUOTA_RESET_TARGET');
	const parsedTarget = target !== null && target !== undefined && target !== '' ? parseInt(target, 10) : NaN;

	return {
		enabled: enabled === null ? true : enabled === 'true',
		time: time || '00:00',
		timezone: timezone || 'Asia/Shanghai',
		target: Number.isFinite(parsedTarget) ? parsedTarget : 2
	};
}

async function setQuotaResetConfig(db, config) {
	const { enabled, time, timezone, target } = config || {};
	const normalizedTarget =
		target === undefined || target === null || target === '' ? 2 : Number.parseInt(String(target), 10);
	await setConfig(db, 'QUOTA_RESET_ENABLED', String(enabled));
	await setConfig(db, 'QUOTA_RESET_TIME', String(time || '00:00'));
	await setConfig(db, 'QUOTA_RESET_TIMEZONE', String(timezone || 'Asia/Shanghai'));
	await setConfig(
		db,
		'QUOTA_RESET_TARGET',
		String(Number.isFinite(normalizedTarget) ? normalizedTarget : 2)
	);
}
