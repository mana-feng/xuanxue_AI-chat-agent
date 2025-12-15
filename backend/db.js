/**
 * 数据库连接模块
 * 仅支持 MySQL
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// 确保加载环境变量（如果 db.js 在 app.js 之前加载）
if (!process.env.DB_PASS && fs.existsSync(path.join(__dirname, '.env'))) {
	try {
		require('dotenv').config({ path: path.join(__dirname, '.env') });
	} catch (e) {
		// dotenv 可能未安装或加载失败，忽略
	}
}

// 数据库配置
const DB_CONFIG = {
	host: process.env.DB_HOST || 'localhost',
	port: Number(process.env.DB_PORT) || 3306,
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASS || '',
	database: process.env.DB_NAME || 'bazi_app',
	charset: 'utf8mb4',
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	// 修复 "Malformed communication packet" 错误
	enableKeepAlive: true,
	keepAliveInitialDelay: 0,
	// 日期时间处理
	dateStrings: false,
	// 连接超时设置
	connectTimeout: 60000,
	// 注意：max_allowed_packet 和 reconnect 不是 MySQL2 连接池的有效选项
	// max_allowed_packet 需要在 MySQL 服务器端配置
	// reconnect 功能由 enableKeepAlive 和连接池自动处理
};

// 验证数据库配置
function validateDatabaseConfig() {
	const issues = [];
	const warnings = [];

	// 检查密码
	if (!process.env.DB_PASS || process.env.DB_PASS.trim() === '') {
		issues.push('DB_PASS 未设置或为空');
	} else {
		// 显示配置信息（隐藏密码）
		console.log('📋 MySQL 配置:');
		console.log(`   Host: ${DB_CONFIG.host}`);
		console.log(`   Port: ${DB_CONFIG.port}`);
		console.log(`   User: ${DB_CONFIG.user}`);
		console.log(`   Password: ${DB_CONFIG.password ? '***' : '(empty)'}`);
		console.log(`   Database: ${DB_CONFIG.database}`);
	}

	// 检查用户
	if (!process.env.DB_USER || process.env.DB_USER.trim() === '') {
		issues.push('DB_USER 未设置或为空');
	}

	// 警告：如果使用默认值
	if (!process.env.DB_HOST) {
		warnings.push('DB_HOST 使用默认值: localhost');
	}
	if (!process.env.DB_NAME) {
		warnings.push('DB_NAME 使用默认值: bazi_app');
	}

	if (warnings.length > 0) {
		console.warn('\n⚠️  配置警告:');
		warnings.forEach((warning) => console.warn(`   - ${warning}`));
	}

	if (issues.length > 0) {
		console.error('\n❌ MySQL 配置错误:');
		issues.forEach((issue) => console.error(`   - ${issue}`));
		console.error('\n请检查 .env 文件中的以下配置:');
		console.error('   DB_HOST=localhost');
		console.error('   DB_PORT=3306');
		console.error('   DB_USER=root');
		console.error('   DB_PASS=your_mysql_password  ← 必须设置');
		console.error('   DB_NAME=bazi_app\n');
		console.error('提示:');
		console.error('   1. 确保 .env 文件在项目根目录');
		console.error('   2. 确保 DB_PASS 不为空');
		console.error('   3. 确保密码与 MySQL root 密码匹配');
		console.error('   4. 可以使用命令测试: mysql -u root -p\n');
		throw new Error('MySQL 配置不完整，请检查 .env 文件');
	}
}

let db = null;
let pool = null;

/**
 * 初始化数据库连接
 */
async function initDatabase() {
	try {
		// 验证配置
		validateDatabaseConfig();

		// 确保数据库存在
		await ensureDatabaseExists();

		pool = mysql.createPool(DB_CONFIG);

		// 测试连接
		const connection = await pool.getConnection();
		console.log('✓ MySQL 数据库连接成功');
		connection.release();

		db = {
			type: 'mysql',
			pool: pool,
			query: async (sql, params) => {
				try {
					const [rows] = await pool.execute(sql, params || []);
					return rows;
				} catch (err) {
					console.error('数据库查询错误:', err.message);
					console.error('SQL:', sql);
					console.error('参数:', params);
					throw err;
				}
			},
			run: async (sql, params) => {
				try {
					const [result] = await pool.execute(sql, params || []);
					return { lastID: result.insertId, changes: result.affectedRows };
				} catch (err) {
					console.error('数据库执行错误:', err.message);
					console.error('SQL:', sql);
					console.error('参数:', params);
					throw err;
				}
			},
			get: async (sql, params) => {
				try {
					const [rows] = await pool.execute(sql, params || []);
					return rows[0] || null;
				} catch (err) {
					console.error('数据库查询错误:', err.message);
					console.error('SQL:', sql);
					console.error('参数:', params);
					throw err;
				}
			},
			all: async (sql, params) => {
				return await db.query(sql, params);
			},
		};

		return db;
	} catch (error) {
		console.error('MySQL 连接失败:', error.message);
		throw error;
	}
}

/**
 * 确保 MySQL 数据库存在
 */
async function ensureDatabaseExists() {
	const dbName = DB_CONFIG.database;
	const tempConfig = { ...DB_CONFIG };
	delete tempConfig.database;

	const tempPool = mysql.createPool(tempConfig);

	try {
		await tempPool.execute(
			`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
		);
		console.log(`✓ 数据库 ${dbName} 已确保存在`);
	} catch (error) {
		console.error('创建数据库失败:', error.message);
		throw error;
	} finally {
		await tempPool.end();
	}
}

/**
 * 执行 MySQL 初始化脚本
 * 解析 SQL 文件并逐条执行
 */
async function executeInitScript(pool, scriptPath) {
	try {
		const sqlContent = fs.readFileSync(scriptPath, 'utf8');

		// 移除注释和空行，分割 SQL 语句
		let statements = sqlContent
			.split(';')
			.map((stmt) => {
				// 移除行内注释（-- 开头的注释）
				let cleaned = stmt.replace(/--.*$/gm, '');
				// 移除多行注释 /* ... */
				cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
				return cleaned.trim();
			})
			.filter((stmt) => {
				// 过滤空语句和 USE 语句（因为已经连接到指定数据库）
				const upper = stmt.toUpperCase().trim();
				return stmt.length > 0 && !upper.startsWith('USE ') && !upper.startsWith('CREATE DATABASE');
			});

		console.log(`正在执行 MySQL 初始化脚本: ${scriptPath}`);
		console.log(`将执行 ${statements.length} 条 SQL 语句`);

		for (let i = 0; i < statements.length; i++) {
			const statement = statements[i];
			if (statement.length > 0) {
				try {
					await pool.execute(statement);
				} catch (error) {
					// 忽略 "表已存在"、"索引已存在" 等错误
					const errorMsg = error.message.toLowerCase();
					if (
						errorMsg.includes('already exists') ||
						errorMsg.includes('duplicate') ||
						errorMsg.includes('exist')
					) {
						// 静默忽略，表/索引已存在是正常的
					} else {
						console.warn(`执行 SQL 语句时出现警告 (${i + 1}/${statements.length}):`, error.message);
						console.warn(`语句预览: ${statement.substring(0, 150).replace(/\s+/g, ' ')}...`);
					}
				}
			}
		}

		console.log('✓ MySQL 初始化脚本执行完成');
	} catch (error) {
		console.error('执行 MySQL 初始化脚本失败:', error.message);
		throw error;
	}
}

/**
 * 检查 MySQL 表是否存在
 */
async function checkTableExists(pool, tableName) {
	try {
		const [rows] = await pool.execute(
			`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
			[DB_CONFIG.database, tableName]
		);
		return rows[0].count > 0;
	} catch (error) {
		return false;
	}
}

/**
 * 自动初始化 MySQL 表结构（如果不存在）
 */
async function autoInitMySQLTables(pool) {
	try {
		// 检查 users 表是否存在
		const usersTableExists = await checkTableExists(pool, 'users');

		if (!usersTableExists) {
			console.log('检测到 MySQL 数据库未初始化，正在执行初始化脚本...');
			const scriptPath = path.join(__dirname, 'init-mysql.sql');

			if (fs.existsSync(scriptPath)) {
				await executeInitScript(pool, scriptPath);
				console.log('✓ MySQL 数据库表结构已自动初始化');
			} else {
				console.warn(`⚠️  初始化脚本不存在: ${scriptPath}，将使用代码方式创建表`);
			}
		} else {
			console.log('✓ MySQL 数据库表已存在，跳过初始化');
		}
	} catch (error) {
		console.error('自动初始化 MySQL 表失败:', error.message);
		throw error;
	}
}

/**
 * 获取数据库实例
 */
function getDatabase() {
	if (!db) {
		throw new Error('数据库未初始化，请先调用 initDatabase()');
	}
	return db;
}

/**
 * 关闭数据库连接
 */
async function closeDatabase() {
	if (pool) {
		await pool.end();
		console.log('MySQL 连接已关闭');
	}
}

module.exports = {
	initDatabase,
	getDatabase,
	closeDatabase,
	autoInitMySQLTables,
};
