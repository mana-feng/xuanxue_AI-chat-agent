/**
 * 邮件服务
 */
const nodemailer = require('nodemailer');
const ConfigService = require('../config-service');
const { getDatabase } = require('../db');
const { generateVerificationCode } = require('../utils/helpers');

let mailTransporter = null;
let emailConfig = {
	host: '',
	port: 0,
	user: '',
	pass: '',
	from: '',
	fromName: '',
};
let emailConfigured = false;

/**
 * 加载邮箱配置并初始化邮件传输器
 */
async function loadEmailConfig() {
	try {
		const db = getDatabase();
		emailConfig = await ConfigService.getEmailConfig(db);
		emailConfigured = await ConfigService.isEmailConfigValid(db);

		if (!emailConfigured) {
			console.warn('⚠️  邮件配置未完成，邮箱验证码将不可用。请在后台管理中配置邮箱服务。');
			mailTransporter = null;
			return;
		}

		// 创建邮件传输器
		mailTransporter = nodemailer.createTransport({
			host: emailConfig.host,
			port: emailConfig.port,
			secure: emailConfig.port === 465, // 465 端口使用 SSL
			auth: {
				user: emailConfig.user,
				pass: emailConfig.pass,
			},
			// 连接超时设置
			connectionTimeout: 10000,
			// 调试选项（生产环境可关闭）
			debug: process.env.NODE_ENV === 'development',
			logger: process.env.NODE_ENV === 'development',
		});

		// 验证连接（异步，不阻塞启动）
		mailTransporter
			.verify()
			.then(() => {
			})
			.catch((verifyError) => {
				console.warn('⚠️  SMTP 连接验证失败:', verifyError.message);
				console.warn('   邮件服务可能无法正常工作，请检查配置');
			});
	} catch (error) {
		console.error('加载邮件配置失败:', error.message);
		emailConfigured = false;
		mailTransporter = null;
	}
}

/**
 * 发送验证码邮件
 */
async function sendVerificationCode(email, code) {
	if (!emailConfigured || !mailTransporter) {
		throw new Error('邮件服务未配置');
	}

	const mailOptions = {
		from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
		to: email,
		subject: '邮箱验证码',
		html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #333;">邮箱验证码</h2>
				<p>您的验证码是：</p>
				<div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;">
					${code}
				</div>
				<p style="color: #666; font-size: 12px;">验证码有效期为10分钟，请勿泄露给他人。</p>
			</div>
		`,
	};

	await mailTransporter.sendMail(mailOptions);
}

/**
 * 获取邮件配置状态
 */
function getEmailConfig() {
	return {
		configured: emailConfigured,
		config: emailConfigured ? {
			host: emailConfig.host,
			port: emailConfig.port,
			user: emailConfig.user,
			from: emailConfig.from,
			fromName: emailConfig.fromName,
		} : null,
	};
}

/**
 * 重新加载邮件配置
 */
async function reloadEmailConfig() {
	await loadEmailConfig();
}

module.exports = {
	loadEmailConfig,
	sendVerificationCode,
	getEmailConfig,
	reloadEmailConfig,
	generateVerificationCode,
};

