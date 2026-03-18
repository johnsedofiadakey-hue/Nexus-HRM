"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeEncrypt = exports.encryptValue = void 0;
const crypto_1 = __importDefault(require("crypto"));
const KEY_SOURCE = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'nexus-hrm-default-key';
const KEY = crypto_1.default.createHash('sha256').update(KEY_SOURCE).digest(); // 32 bytes
const encryptValue = (plain) => {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};
exports.encryptValue = encryptValue;
const maybeEncrypt = (value) => {
    if (value === undefined || value === null)
        return null;
    const str = String(value).trim();
    if (!str)
        return null;
    return (0, exports.encryptValue)(str);
};
exports.maybeEncrypt = maybeEncrypt;
