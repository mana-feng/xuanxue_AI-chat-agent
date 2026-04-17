/**
 * 时间工具函数
 */

/**
 * 获取北京时间
 * @returns {Date} 北京时间的Date对象
 */
function getBeijingTime() {
	const now = new Date();
	// 北京时间是 UTC+8
	const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
	return beijingTime;
}

/**
 * 将 Date 对象转换为 MySQL DATETIME 格式 (YYYY-MM-DD HH:MM:SS)
 * @param {Date} date - JavaScript Date 对象
 * @returns {string} MySQL DATETIME 格式字符串
 */
function formatMySQLDateTime(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
	getBeijingTime,
	formatMySQLDateTime,
};

