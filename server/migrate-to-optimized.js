// 迁移脚本：从旧版本迁移到优化版本
// 此脚本会：
// 1. 备份现有数据库
// 2. 添加缺失的字段和索引
// 3. 验证数据完整性

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_FILE = path.join(__dirname, 'bazi.db');
const BACKUP_FILE = path.join(__dirname, `bazi_backup_${Date.now()}.db`);

console.log('开始迁移到优化版本...\n');

// 检查数据库文件是否存在
if (!fs.existsSync(DB_FILE)) {
	console.log('数据库文件不存在，将创建新数据库');
}

// 备份数据库
function backupDatabase() {
	return new Promise((resolve, reject) => {
		if (!fs.existsSync(DB_FILE)) {
			console.log('数据库文件不存在，跳过备份');
			return resolve();
		}
		
		console.log('正在备份数据库...');
		fs.copyFile(DB_FILE, BACKUP_FILE, (err) => {
			if (err) {
				console.error('备份失败:', err);
				return reject(err);
			}
			console.log(`✅ 数据库已备份到: ${BACKUP_FILE}\n`);
			resolve();
		});
	});
}

// 迁移数据库结构
function migrateDatabase() {
	return new Promise((resolve, reject) => {
		const db = new sqlite3.Database(DB_FILE, (err) => {
			if (err) {
				console.error('数据库连接失败:', err);
				return reject(err);
			}
		});

		db.serialize(() => {
			console.log('检查表结构...');
			
			// 检查 users 表
			db.all('PRAGMA table_info(users)', (err, rows) => {
				if (err) {
					console.error('检查 users 表失败:', err);
					return reject(err);
				}
				
				const columns = rows.map(r => r.name);
				console.log('users 表现有字段:', columns.join(', '));
				
				// 添加 username 字段（如果不存在）
				if (!columns.includes('username')) {
					console.log('添加 username 字段...');
					db.run('ALTER TABLE users ADD COLUMN username TEXT UNIQUE', (alterErr) => {
						if (alterErr) {
							console.error('添加 username 字段失败:', alterErr);
						} else {
							console.log('✅ username 字段已添加');
						}
					});
				}
				
				// 添加 updated_at 字段（如果不存在）
				if (!columns.includes('updated_at')) {
					console.log('添加 updated_at 字段...');
					db.run('ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP', (alterErr) => {
						if (alterErr) {
							console.error('添加 updated_at 字段失败:', alterErr);
						} else {
							console.log('✅ updated_at 字段已添加');
						}
					});
				}
			});
			
			// 检查 bazi_records 表
			db.all('PRAGMA table_info(bazi_records)', (err, rows) => {
				if (err) {
					console.error('检查 bazi_records 表失败:', err);
					return reject(err);
				}
				
				const columns = rows.map(r => r.name);
				console.log('bazi_records 表现有字段:', columns.join(', '));
				
				// 添加 updated_at 字段（如果不存在）
				if (!columns.includes('updated_at')) {
					console.log('添加 updated_at 字段...');
					db.run('ALTER TABLE bazi_records ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP', (alterErr) => {
						if (alterErr) {
							console.error('添加 updated_at 字段失败:', alterErr);
						} else {
							console.log('✅ updated_at 字段已添加');
						}
					});
				}
			});
			
			// 创建索引
			console.log('\n创建索引...');
			const indexes = [
				{ name: 'idx_users_email', sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)' },
				{ name: 'idx_users_username', sql: 'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)' },
				{ name: 'idx_bazi_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_bazi_user_id ON bazi_records(user_id)' },
				{ name: 'idx_bazi_user_created', sql: 'CREATE INDEX IF NOT EXISTS idx_bazi_user_created ON bazi_records(user_id, created_at DESC)' },
				{ name: 'idx_bazi_user_name', sql: 'CREATE INDEX IF NOT EXISTS idx_bazi_user_name ON bazi_records(user_id, name)' },
				{ name: 'idx_bazi_user_gender', sql: 'CREATE INDEX IF NOT EXISTS idx_bazi_user_gender ON bazi_records(user_id, gender)' },
				{ name: 'idx_email_code', sql: 'CREATE INDEX IF NOT EXISTS idx_email_code ON email_verification_codes(email, code, type, used)' },
				{ name: 'idx_email_expires', sql: 'CREATE INDEX IF NOT EXISTS idx_email_expires ON email_verification_codes(email, expires_at)' },
				{ name: 'idx_email_expires_cleanup', sql: 'CREATE INDEX IF NOT EXISTS idx_email_expires_cleanup ON email_verification_codes(expires_at)' }
			];
			
			let completed = 0;
			indexes.forEach((index, i) => {
				db.run(index.sql, (err) => {
					if (err) {
						console.error(`创建索引 ${index.name} 失败:`, err);
					} else {
						console.log(`✅ 索引 ${index.name} 已创建`);
					}
					completed++;
					if (completed === indexes.length) {
						console.log('\n✅ 所有索引创建完成');
						resolve();
					}
				});
			});
		});
	});
}

// 验证数据完整性
function verifyData() {
	return new Promise((resolve, reject) => {
		const db = new sqlite3.Database(DB_FILE);
		
		console.log('\n验证数据完整性...');
		
		db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
			if (err) {
				console.error('验证失败:', err);
				return reject(err);
			}
			console.log(`✅ 用户数量: ${row.count}`);
		});
		
		db.get('SELECT COUNT(*) as count FROM bazi_records', (err, row) => {
			if (err) {
				console.error('验证失败:', err);
				return reject(err);
			}
			console.log(`✅ 八字记录数量: ${row.count}`);
		});
		
		db.get('SELECT COUNT(*) as count FROM email_verification_codes', (err, row) => {
			if (err) {
				console.error('验证失败:', err);
				return reject(err);
			}
			console.log(`✅ 验证码记录数量: ${row.count}`);
			
			db.close((closeErr) => {
				if (closeErr) {
					console.error('关闭数据库失败:', closeErr);
				}
				console.log('\n✅ 数据验证完成');
				resolve();
			});
		});
	});
}

// 执行迁移
async function runMigration() {
	try {
		await backupDatabase();
		await migrateDatabase();
		await verifyData();
		
		console.log('\n🎉 迁移完成！');
		console.log('\n下一步：');
		console.log('1. 安装 Redis（可选）: npm install redis');
		console.log('2. 启动优化后的服务器: node server/app-optimized.js');
		console.log('3. 查看优化指南: cat server/OPTIMIZATION_GUIDE.md');
	} catch (error) {
		console.error('\n❌ 迁移失败:', error);
		console.log('\n如果遇到问题，可以使用备份文件恢复:');
		console.log(`cp ${BACKUP_FILE} ${DB_FILE}`);
		process.exit(1);
	}
}

runMigration();

