#!/usr/bin/env node

/**
 * 构建安全检查脚本
 * 用于验证前端构建产物中不包含敏感信息
 */

const fs = require('fs');
const path = require('path');

const SENSITIVE_KEYWORDS = [
  'DB_PASS',
  'DB_PASSWORD',
  'JWT_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'SMTP_PASS',
  'API_KEY',
  'SECRET',
];

const BUILD_DIR = path.join(__dirname, '..', 'dist', 'build', 'h5');

function checkBuildSecurity() {
  console.log('🔍 开始检查构建产物安全性...\n');

  // 检查构建目录是否存在
  if (!fs.existsSync(BUILD_DIR)) {
    console.log('⚠️  构建目录不存在，请先运行构建命令：');
    console.log('   npm run build:h5\n');
    return false;
  }

  let foundIssues = false;

  // 检查是否有 .env 文件
  const envFile = path.join(BUILD_DIR, '.env');
  if (fs.existsSync(envFile)) {
    console.log('❌ 发现 .env 文件在构建产物中！');
    console.log(`   位置: ${envFile}`);
    console.log('   建议: 检查构建配置，确保 .env 文件不会被复制\n');
    foundIssues = true;
  } else {
    console.log('✅ 构建产物中没有 .env 文件');
  }

  // 检查构建产物中的敏感关键词
  console.log('\n🔍 搜索敏感关键词...');
  const files = getAllFiles(BUILD_DIR);
  const suspiciousFiles = [];

  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        for (const keyword of SENSITIVE_KEYWORDS) {
          // 检查是否包含敏感关键词（排除注释和示例代码）
          const regex = new RegExp(`\\b${keyword}\\s*[:=]`, 'i');
          if (regex.test(content) && !isInComment(content, keyword)) {
            suspiciousFiles.push({
              file: path.relative(BUILD_DIR, file),
              keyword,
            });
            foundIssues = true;
          }
        }
      } catch (err) {
        // 忽略读取错误（可能是二进制文件）
      }
    }
  }

  if (suspiciousFiles.length > 0) {
    console.log('\n❌ 发现可疑的敏感信息：');
    suspiciousFiles.forEach(({ file, keyword }) => {
      console.log(`   - ${file} (关键词: ${keyword})`);
    });
    console.log('\n⚠️  请检查这些文件，确认是否包含真实的敏感信息');
  } else {
    console.log('✅ 未发现敏感关键词');
  }

  // 检查环境变量使用
  console.log('\n🔍 检查环境变量使用...');
  let hasViteEnv = false;
  for (const file of files) {
    if (file.endsWith('.js')) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('VITE_API_BASE_URL')) {
          hasViteEnv = true;
          // 检查是否有非 VITE_ 开头的环境变量
          const nonViteEnvRegex = /(?:process\.env|import\.meta\.env)\.(?!VITE_)([A-Z_]+)/g;
          const matches = content.match(nonViteEnvRegex);
          if (matches) {
            console.log('⚠️  发现非 VITE_ 开头的环境变量使用：');
            matches.forEach((match) => {
              console.log(`   - ${match}`);
            });
            foundIssues = true;
          }
        }
      } catch (err) {
        // 忽略
      }
    }
  }

  if (hasViteEnv) {
    console.log('✅ 发现 VITE_API_BASE_URL 使用（这是正常的，API地址可以公开）');
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  if (foundIssues) {
    console.log('❌ 安全检查未通过！请修复上述问题后再部署。');
    return false;
  } else {
    console.log('✅ 安全检查通过！构建产物是安全的。');
    console.log('\n📝 说明：');
    console.log('   - .env 文件不会被打包到前端代码中');
    console.log('   - 只有 VITE_ 开头的环境变量会被注入');
    console.log('   - 数据库配置、JWT密钥等不会泄露');
    return true;
  }
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function isInComment(content, keyword) {
  const index = content.indexOf(keyword);
  if (index === -1) return false;

  const before = content.substring(Math.max(0, index - 100), index);
  return before.includes('//') || before.includes('/*') || before.includes('*');
}

// 运行检查
if (require.main === module) {
  const result = checkBuildSecurity();
  process.exit(result ? 0 : 1);
}

module.exports = { checkBuildSecurity };

