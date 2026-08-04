const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const MASTER_KEY = Buffer.from(process.env.MASTER_ENCRYPTION_KEY, 'hex');

/**
 * Encrypts plaintext string into "iv:authTag:ciphertext" format
 * @param {string} plainText - The text to encrypt
 * @returns {string} - Combined encrypted string
 */
function encrypt(plainText) {
    if (!plainText) return null;
    
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts "iv:authTag:ciphertext" format back to plaintext
 * @param {string} combinedString - The encrypted string from DB
 * @returns {string} - Decrypted plaintext
 */
function decrypt(combinedString) {
    if (!combinedString) return null;
    
    const [ivHex, authTagHex, encryptedHex] = combinedString.split(':');
    
    if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

module.exports = { encrypt, decrypt };