import fs from 'fs';
import path from 'path';

class I18nService {
  private locales: Record<string, any> = {};

  constructor() {
    this.loadLocales();
  }

  private loadLocales() {
    const localesDir = path.join(__dirname, '../locales');
    if (!fs.existsSync(localesDir)) {
      console.warn('[I18nService] Locales directory not found');
      return;
    }

    const files = fs.readdirSync(localesDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const lang = file.replace('.json', '');
        const content = fs.readFileSync(path.join(localesDir, file), 'utf8');
        this.locales[lang] = JSON.parse(content);
      }
    });
  }

  /**
   * Translate a key into the target language.
   * Supports nested keys (e.g., 'pdf.header.title')
   */
  translate(key: string, lang: string = 'en'): string {
    const dict = this.locales[lang] || this.locales['en'] || {};
    const keys = key.split('.');
    
    let result = dict;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key; // Fallback to key if not found
      }
    }

    return typeof result === 'string' ? result : key;
  }
}

export const i18n = new I18nService();
