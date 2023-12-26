const crypto = require('crypto');

function generateRandomKey() {
    const keyLength = 32; // 设置私钥的长度，单位是字节（这里是256位）
    return crypto.randomBytes(keyLength).toString('base64');
}
const privateKey = generateRandomKey();
console.log('随机生成的私钥:', privateKey);