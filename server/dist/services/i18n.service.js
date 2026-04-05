"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.i18n = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class I18nService {
    constructor() {
        this.locales = {};
        this.loadLocales();
    }
    loadLocales() {
        const localesDir = path_1.default.join(__dirname, '../locales');
        if (!fs_1.default.existsSync(localesDir)) {
            console.warn('[I18nService] Locales directory not found');
            return;
        }
        const files = fs_1.default.readdirSync(localesDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const lang = file.replace('.json', '');
                const content = fs_1.default.readFileSync(path_1.default.join(localesDir, file), 'utf8');
                this.locales[lang] = JSON.parse(content);
            }
        });
    }
    /**
     * Translate a key into the target language.
     * Supports nested keys (e.g., 'pdf.header.title')
     */
    translate(key, lang = 'en') {
        const dict = this.locales[lang] || this.locales['en'] || {};
        const keys = key.split('.');
        let result = dict;
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            }
            else {
                return key; // Fallback to key if not found
            }
        }
        return typeof result === 'string' ? result : key;
    }
}
exports.i18n = new I18nService();
