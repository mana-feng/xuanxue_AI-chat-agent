/**
 * 数据库配置示例文件
 * 实际配置从环境变量读取，此文件仅作为参考
 */

module.exports = {
	// 数据库主机
	host: 'localhost',
	
	// 数据库端口
	port: 3306,
	
	// 数据库用户名
	user: 'root',
	
	// 数据库密码
	password: 'your_password_here',
	
	// 数据库名称
	database: 'bazi_app',
	
	// 字符集
	charset: 'utf8mb4',
	
	// 连接池配置
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	
	// 保持连接
	enableKeepAlive: true,
	keepAliveInitialDelay: 0,
	
	// 日期时间处理
	dateStrings: false,
	
	// 连接超时（毫秒）
	connectTimeout: 60000,
};

