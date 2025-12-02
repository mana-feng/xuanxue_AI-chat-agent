/**
 * 邮箱验证码使用示例
 * 
 * 使用方法：
 * 1. 导入工具方法
 * 2. 在需要的地方调用发送和验证方法
 */

import { sendEmailVerificationCode, verifyEmailCode } from './emailVerification';

// ========== 示例1：在注册页面发送验证码 ==========
async function exampleSendCode() {
	try {
		const result = await sendEmailVerificationCode('user@example.com', 'register');
		
		if (result.success) {
			uni.showToast({
				title: result.message || '验证码已发送',
				icon: 'success',
				duration: 2000
			});
			
			// 开发环境可能会返回 code，可以用于测试
			if (result.code) {
				console.log('开发模式验证码:', result.code);
			}
		}
	} catch (error: any) {
		uni.showToast({
			title: error.message || '发送失败',
			icon: 'none',
			duration: 2000
		});
	}
}

// ========== 示例2：验证邮箱验证码 ==========
async function exampleVerifyCode() {
	try {
		const result = await verifyEmailCode('user@example.com', '123456', 'register');
		
		if (result.success) {
			uni.showToast({
				title: '验证码验证成功',
				icon: 'success',
				duration: 2000
			});
			// 验证成功后可以继续注册流程
		}
	} catch (error: any) {
		uni.showToast({
			title: error.message || '验证失败',
			icon: 'none',
			duration: 2000
		});
	}
}

// ========== 示例3：在注册表单中使用（带倒计时） ==========
/*
// 在组件中定义
const registerEmail = ref('');
const verificationCode = ref('');
const codeCountdown = ref(0);
let countdownTimer: any = null;

// 发送验证码（带倒计时）
async function sendCode() {
	if (!registerEmail.value) {
		uni.showToast({
			title: '请先输入邮箱',
			icon: 'none'
		});
		return;
	}
	
	try {
		await sendEmailVerificationCode(registerEmail.value, 'register');
		uni.showToast({
			title: '验证码已发送',
			icon: 'success'
		});
		
		// 开始倒计时（60秒）
		codeCountdown.value = 60;
		if (countdownTimer) clearInterval(countdownTimer);
		countdownTimer = setInterval(() => {
			codeCountdown.value--;
			if (codeCountdown.value <= 0) {
				clearInterval(countdownTimer);
				countdownTimer = null;
			}
		}, 1000);
	} catch (error: any) {
		uni.showToast({
			title: error.message || '发送失败',
			icon: 'none'
		});
	}
}

// 提交注册前验证验证码
async function submitRegister() {
	// 先验证验证码
	try {
		await verifyEmailCode(registerEmail.value, verificationCode.value, 'register');
		// 验证成功，继续注册流程
		// ... 调用注册API
	} catch (error: any) {
		uni.showToast({
			title: error.message || '验证码错误',
			icon: 'none'
		});
		return;
	}
}
*/

export { exampleSendCode, exampleVerifyCode };

