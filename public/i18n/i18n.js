/**
 * Simple Internationalization (i18n) utility for RODB
 * Supports Nepali and English
 */

class I18n {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.translations = {};
        this.loadTranslations();
    }

    /**
     * Detect language from localStorage or browser
     */
    detectLanguage() {
        // Check localStorage first
        const saved = localStorage.getItem('language');
        if (saved) return saved;
        
        // Default to Nepali
        return 'ne';
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            const response = await fetch(`/public/i18n/${this.currentLanguage}.json`);
            this.translations = await response.json();
            this.applyTranslations();
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }

    /**
     * Get translated string
     * Usage: t('admin.dashboard') or t('common.search')
     */
    t(key) {
        const parts = key.split('.');
        let value = this.translations;
        
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                console.warn(`Translation not found: ${key}`);
                return key; // Return key if translation not found
            }
        }
        
        return typeof value === 'string' ? value : key;
    }

    /**
     * Set language and reload translations
     */
    async setLanguage(lang) {
        if (lang !== 'en' && lang !== 'ne') {
            console.error('Unsupported language:', lang);
            return;
        }
        
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        
        // Update HTML lang attribute
        document.documentElement.lang = lang;
        
        // Reload translations
        await this.loadTranslations();
    }

    /**
     * Get current language
     */
    getLanguage() {
        return this.currentLanguage;
    }

    /**
     * Check if Nepali is active
     */
    isNepali() {
        return this.currentLanguage === 'ne';
    }

    /**
     * Apply translations to HTML elements with data-i18n attribute
     * Usage: <button data-i18n="admin.save">Save</button>
     */
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Check if it's a button, input, or text element
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update HTML lang
        document.documentElement.lang = this.currentLanguage;
    }

    /**
     * Create a language switcher button
     */
    createLanguageSwitcher() {
        const container = document.getElementById('languageSwitcher');
        if (!container) return;

        const nepaliBtn = document.createElement('button');
        nepaliBtn.textContent = 'नेपाली';
        nepaliBtn.className = this.currentLanguage === 'ne' ? 'active' : '';
        nepaliBtn.onclick = () => this.setLanguage('ne');

        const englishBtn = document.createElement('button');
        englishBtn.textContent = 'English';
        englishBtn.className = this.currentLanguage === 'en' ? 'active' : '';
        englishBtn.onclick = () => this.setLanguage('en');

        container.innerHTML = '';
        container.appendChild(nepaliBtn);
        container.appendChild(englishBtn);
    }
}

// Create global instance
const i18n = new I18n();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18n;
}
