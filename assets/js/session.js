// Sistema de gerenciamento de sessão sem cache
// Substitui localStorage por sessões temporárias

class SessionManager {
    constructor() {
        this.session = {};
        this.expiry = Date.now() + (30 * 60 * 1000); // 30 minutos
    }

    set(key, value) {
        // Sempre expira a sessão após 30 minutos
        if (Date.now() > this.expiry) {
            this.clear();
            return false;
        }
        this.session[key] = value;
        return true;
    }

    get(key) {
        if (Date.now() > this.expiry) {
            this.clear();
            return null;
        }
        return this.session[key] || null;
    }

    remove(key) {
        delete this.session[key];
    }

    clear() {
        this.session = {};
        this.expiry = Date.now() + (30 * 60 * 1000);
    }

    isExpired() {
        return Date.now() > this.expiry;
    }

    refreshExpiry() {
        this.expiry = Date.now() + (30 * 60 * 1000);
    }
}

// Instância global do gerenciador de sessão
window.sessionManager = new SessionManager();