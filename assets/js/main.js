// ========================================
// CONGRESS PASSENGER CONTROL - MAIN JS
// ========================================

'use strict';

// ========================================
// CONSTANTES E CONFIGURAÇÕES
// ========================================

const CONFIG = {
    API_URL: '/api/db',
    CURRENCY_FORMAT: { style: 'currency', currency: 'BRL' },
    NOTIFICATION_DURATION: 3000,
    DEFAULT_PRICES: {
        friday: '50.00',
        saturday: '50.00',
        sunday: '50.00'
    },
    DEFAULT_SEAT_COUNT: 16
};

const DAYS_OF_WEEK = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// ========================================
// ESTADO DA APLICAÇÃO
// ========================================

class AppState {
    constructor() {
        this.attendees = { friday: [], saturday: [], sunday: [] };
        this.arrangement = null;
        this.currentEvent = null;
        this.currentToken = null;
        this.currentCongregation = null;
        this.editingPassengerId = null;
    }

    // Getters e setters para estado
    setAttendees(attendees) {
        this.attendees = attendees || { friday: [], saturday: [], sunday: [] };
    }

    setArrangement(arrangement) {
        this.arrangement = arrangement;
    }

    setCurrentEvent(event) {
        this.currentEvent = event;
    }

    setAuth(token, congregation) {
        this.currentToken = token;
        this.currentCongregation = congregation;
    }
}

// ========================================
// UTILITÁRIOS
// ========================================

class Utils {
    static formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', CONFIG.CURRENCY_FORMAT).format(value);
    }

    static formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
        return `${dayOfWeek}, ${date.toLocaleDateString('pt-BR')}`;
    }

    static generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
}

// ========================================
// SISTEMA DE NOTIFICAÇÕES
// ========================================

class NotificationSystem {
    constructor() {
        this.createNotificationArea();
    }

    createNotificationArea() {
        if (!document.getElementById('notification-area')) {
            const notificationArea = document.createElement('div');
            notificationArea.id = 'notification-area';
            notificationArea.className = 'notification';
            document.body.appendChild(notificationArea);
        }
    }

    show(message, type = 'info', duration = CONFIG.NOTIFICATION_DURATION) {
        const notificationArea = document.getElementById('notification-area');

        // Limpa classes anteriores
        notificationArea.className = 'notification';

        // Define o conteúdo
        notificationArea.innerHTML = `
            <span class="notification-icon">${this.getIcon(type)}</span>
            <span class="notification-message">${Utils.sanitizeInput(message)}</span>
        `;

        // Adiciona classes
        notificationArea.classList.add(type, 'show');

        // Auto-hide se duration > 0
        if (duration > 0) {
            setTimeout(() => {
                notificationArea.classList.remove('show');
            }, duration);
        }

        return notificationArea;
    }

    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    hide() {
        const notificationArea = document.getElementById('notification-area');
        if (notificationArea) {
            notificationArea.classList.remove('show');
        }
    }
}

// ========================================
// SISTEMA DE LOADING
// ========================================

class LoadingSystem {
    static show(element = null) {
        if (element) {
            element.disabled = true;
            const originalText = element.textContent;
            element.textContent = '';
            element.innerHTML = '<span class="loading"></span> Carregando...';
            element.dataset.originalText = originalText;
        } else {
            // Loading global
            if (!document.getElementById('loading-overlay')) {
                const overlay = document.createElement('div');
                overlay.id = 'loading-overlay';
                overlay.className = 'loading-overlay';
                overlay.innerHTML = '<div class="loading-spinner"></div>';
                document.body.appendChild(overlay);
            }
        }
    }

    static hide(element = null) {
        if (element) {
            element.disabled = false;
            element.textContent = element.dataset.originalText || 'Concluído';
            delete element.dataset.originalText;
        } else {
            // Remove loading global
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    }
}

// ========================================
// SISTEMA DE DADOS
// ========================================

class DataService {
    constructor(appState, notifications) {
        this.appState = appState;
        this.notifications = notifications;
    }

    async saveData() {
        try {
            const dataToSave = {
                attendees: this.appState.attendees,
                prices: this.getPricesFromInputs()
            };

            // Salvar no sistema de eventos se autenticado
            if (this.appState.currentEvent && this.appState.currentToken) {
                await this.saveToEventSystem(dataToSave);
            }

            // Salvar no sistema legado
            await this.saveToLegacySystem(dataToSave);

        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            this.notifications.show('Erro ao salvar os dados. Verifique a conexão.', 'error');
        }
    }

    async saveToEventSystem(dataToSave) {
        const response = await fetch(`/api/events/${this.appState.currentEvent.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.appState.currentToken}`
            },
            body: JSON.stringify({
                attendees_data: dataToSave.attendees,
                prices: dataToSave.prices
            })
        });

        if (!response.ok) {
            throw new Error('Falha ao salvar no sistema de eventos');
        }
    }

    async saveToLegacySystem(dataToSave) {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSave),
        });

        if (!response.ok) {
            throw new Error('Falha ao salvar no sistema legado');
        }
    }

    async loadData() {
        try {
            const response = await fetch(CONFIG.API_URL);
            if (!response.ok) {
                throw new Error('Falha na resposta da rede');
            }

            const data = await response.json();
            this.appState.setAttendees(data.attendees);

            if (data.prices) {
                this.updatePriceInputs(data.prices);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Usar dados padrão em caso de erro
            this.appState.setAttendees({ friday: [], saturday: [], sunday: [] });
        }
    }

    getPricesFromInputs() {
        const priceElements = {
            friday: document.getElementById('friday-price'),
            saturday: document.getElementById('saturday-price'),
            sunday: document.getElementById('sunday-price')
        };

        return {
            friday: priceElements.friday?.value || CONFIG.DEFAULT_PRICES.friday,
            saturday: priceElements.saturday?.value || CONFIG.DEFAULT_PRICES.saturday,
            sunday: priceElements.sunday?.value || CONFIG.DEFAULT_PRICES.sunday
        };
    }

    updatePriceInputs(prices) {
        const priceElements = {
            friday: document.getElementById('friday-price'),
            saturday: document.getElementById('saturday-price'),
            sunday: document.getElementById('sunday-price')
        };

        Object.keys(prices).forEach(day => {
            if (priceElements[day]) {
                priceElements[day].value = prices[day];
            }
        });
    }
}

// ========================================
// GERENCIADOR DE PASSAGEIROS
// ========================================

class PassengerManager {
    constructor(appState, dataService, notifications) {
        this.appState = appState;
        this.dataService = dataService;
        this.notifications = notifications;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const addBtn = document.getElementById('add-btn');
        const nameInput = document.getElementById('name-input');
        const priceInputs = document.querySelectorAll('.price-input');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.handleAddPassenger());
        }

        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAddPassenger();
                }
            });
        }

        priceInputs.forEach(input => {
            input.addEventListener('change', Utils.debounce(() => {
                this.updateDisplay();
            }, 300));
        });
    }

    async handleAddPassenger() {
        const nameInput = document.getElementById('name-input');
        const amountInput = document.getElementById('amount-input');
        const dayCheckboxes = document.querySelectorAll('input[name="days"]:checked');

        const name = nameInput.value.trim();
        const amountPaid = parseFloat(amountInput.value) || 0;
        const selectedDays = Array.from(dayCheckboxes).map(cb => cb.value);

        // Validações
        if (!this.validatePassengerInput(name, selectedDays)) {
            return;
        }

        try {
            LoadingSystem.show(document.getElementById('add-btn'));

            await this.addPassenger(name, amountPaid, selectedDays);
            this.resetForm();
            this.updateDisplay();
            this.notifications.show(`${name} adicionado com sucesso!`, 'success');

        } catch (error) {
            console.error('Erro ao adicionar passageiro:', error);
            this.notifications.show('Erro ao adicionar passageiro.', 'error');
        } finally {
            LoadingSystem.hide(document.getElementById('add-btn'));
        }
    }

    validatePassengerInput(name, selectedDays) {
        if (!name) {
            this.notifications.show('Por favor, insira o nome do passageiro.', 'error');
            return false;
        }

        if (name.length < 2) {
            this.notifications.show('Nome deve ter pelo menos 2 caracteres.', 'error');
            return false;
        }

        if (selectedDays.length === 0) {
            this.notifications.show('Por favor, selecione pelo menos um dia.', 'error');
            return false;
        }

        return true;
    }

    async addPassenger(name, amountPaid, selectedDays) {
        // Remove passageiro existente se editando
        if (this.appState.editingPassengerId) {
            this.removePassengerById(this.appState.editingPassengerId);
        }

        const prices = this.dataService.getPricesFromInputs();
        let totalOwed = 0;

        selectedDays.forEach(day => {
            totalOwed += parseFloat(prices[day]) || 0;
        });

        const passenger = {
            id: this.appState.editingPassengerId || Utils.generateId(),
            name: Utils.sanitizeInput(name),
            amountPaid: amountPaid,
            totalOwed: totalOwed,
            remainingBalance: Math.max(0, totalOwed - amountPaid)
        };

        // Adiciona aos dias selecionados
        selectedDays.forEach(day => {
            this.appState.attendees[day].push(passenger);
        });

        await this.dataService.saveData();
    }

    removePassengerById(passengerId) {
        Object.keys(this.appState.attendees).forEach(day => {
            this.appState.attendees[day] = this.appState.attendees[day].filter(p => p.id !== passengerId);
        });
    }

    editPassenger(passengerId) {
        let passengerToEdit = null;

        // Encontra o passageiro
        Object.keys(this.appState.attendees).forEach(day => {
            const found = this.appState.attendees[day].find(p => p.id === passengerId);
            if (found) {
                passengerToEdit = found;
            }
        });

        if (!passengerToEdit) return;

        // Preenche o formulário
        document.getElementById('name-input').value = passengerToEdit.name;
        document.getElementById('amount-input').value = passengerToEdit.amountPaid;

        // Marca os checkboxes corretos
        document.querySelectorAll('input[name="days"]').forEach(checkbox => {
            checkbox.checked = this.appState.attendees[checkbox.value].some(p => p.id === passengerId);
        });

        // Atualiza UI
        document.getElementById('add-btn').textContent = 'Salvar Alterações';
        document.getElementById('form-title').textContent = 'Editando Passageiro';
        this.appState.editingPassengerId = passengerId;

        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('name-input').focus();
    }

    async deletePassenger(passengerId) {
        if (!confirm('Tem certeza que deseja excluir este passageiro de todas as listas?')) {
            return;
        }

        try {
            this.removePassengerById(passengerId);
            await this.dataService.saveData();
            this.updateDisplay();
            this.notifications.show('Passageiro excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir passageiro:', error);
            this.notifications.show('Erro ao excluir passageiro.', 'error');
        }
    }

    resetForm() {
        document.getElementById('name-input').value = '';
        document.getElementById('amount-input').value = '';
        document.querySelectorAll('input[name="days"]').forEach(cb => cb.checked = false);
        document.getElementById('add-btn').textContent = 'Adicionar à Lista';
        document.getElementById('form-title').textContent = 'Adicionar Passageiro';
        this.appState.editingPassengerId = null;
        document.getElementById('name-input').focus();
    }

    updateDisplay() {
        this.updatePassengerLists();
        this.updateSummaries();
        this.updateVehicleCounts();
    }

    updatePassengerLists() {
        const allPassengers = this.getAllPassengersMap();

        Object.keys(this.appState.attendees).forEach(day => {
            const listElement = document.getElementById(`${day}-list`);
            if (!listElement) return;

            listElement.innerHTML = '';

            // Ordena por nome
            const sortedPassengers = [...this.appState.attendees[day]].sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            sortedPassengers.forEach(passenger => {
                const listItem = this.createPassengerListItem(passenger, allPassengers[passenger.id]);
                listElement.appendChild(listItem);
            });
        });
    }

    getAllPassengersMap() {
        const allPassengers = {};

        Object.keys(this.appState.attendees).forEach(day => {
            this.appState.attendees[day].forEach(passenger => {
                if (!allPassengers[passenger.id]) {
                    // Recalcula valores baseado em todos os dias
                    const selectedDays = [];
                    Object.keys(this.appState.attendees).forEach(d => {
                        if (this.appState.attendees[d].some(p => p.id === passenger.id)) {
                            selectedDays.push(d);
                        }
                    });

                    const prices = this.dataService.getPricesFromInputs();
                    let totalOwed = 0;
                    selectedDays.forEach(d => {
                        totalOwed += parseFloat(prices[d]) || 0;
                    });

                    passenger.totalOwed = totalOwed;
                    passenger.remainingBalance = Math.max(0, totalOwed - passenger.amountPaid);
                    allPassengers[passenger.id] = passenger;
                }
            });
        });

        return allPassengers;
    }

    createPassengerListItem(passenger, updatedPassenger) {
        const listItem = document.createElement('li');
        listItem.className = 'passenger-item slide-in';

        const statusClass = updatedPassenger.remainingBalance <= 0 ? 'text-success' : 'text-danger';
        const statusText = updatedPassenger.remainingBalance <= 0 ?
            'Pago ✓' :
            `Falta: ${Utils.formatCurrency(updatedPassenger.remainingBalance)} ❌`;

        listItem.innerHTML = `
            <div class="passenger-name">${updatedPassenger.name}</div>
            <div class="passenger-payment">
                Pagou: ${Utils.formatCurrency(updatedPassenger.amountPaid)} de ${Utils.formatCurrency(updatedPassenger.totalOwed)}
            </div>
            <div class="passenger-status ${statusClass}">
                <strong>${statusText}</strong>
            </div>
            <div class="passenger-actions">
                <button class="btn btn-warning btn-sm" onclick="passengerManager.editPassenger(${updatedPassenger.id})">
                    Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="passengerManager.deletePassenger(${updatedPassenger.id})">
                    Excluir
                </button>
            </div>
        `;

        return listItem;
    }

    updateSummaries() {
        const prices = this.dataService.getPricesFromInputs();

        Object.keys(this.appState.attendees).forEach(day => {
            const countElement = document.getElementById(`${day}-count`);
            const collectedElement = document.getElementById(`${day}-collected`);
            const pendingElement = document.getElementById(`${day}-pending`);

            if (!countElement || !collectedElement || !pendingElement) return;

            let dayTotalCollected = 0;
            let dayTotalPending = 0;
            const priceForDay = parseFloat(prices[day]) || 0;

            this.appState.attendees[day].forEach(passenger => {
                const portionPaidForDay = passenger.totalOwed > 0 ?
                    Math.min(passenger.amountPaid / passenger.totalOwed * priceForDay, priceForDay) : 0;

                dayTotalCollected += portionPaidForDay;
                dayTotalPending += priceForDay - portionPaidForDay;
            });

            countElement.textContent = this.appState.attendees[day].length;
            collectedElement.textContent = Utils.formatCurrency(dayTotalCollected);
            pendingElement.textContent = Utils.formatCurrency(Math.max(0, dayTotalPending));
        });
    }

    updateVehicleCounts() {
        const seatCount = this.appState.arrangement?.seatCount || CONFIG.DEFAULT_SEAT_COUNT;

        Object.keys(this.appState.attendees).forEach(day => {
            const vansElement = document.getElementById(`${day}-vans`);
            if (vansElement) {
                const passengerCount = this.appState.attendees[day].length;
                const vehicleCount = passengerCount > 0 ? Math.ceil(passengerCount / seatCount) : 0;
                vansElement.textContent = vehicleCount;
            }
        });
    }
}

// ========================================
// GERENCIADOR DE AUTENTICAÇÃO
// ========================================

class AuthManager {
    constructor(appState, notifications) {
        this.appState = appState;
        this.notifications = notifications;
    }

    checkAuthentication() {
        const token = sessionManager.get('auth_token');
        const congregation = sessionManager.get('congregation');

        if (token && congregation) {
            this.appState.setAuth(token, JSON.parse(congregation));
            this.verifyToken(token);
        } else {
            this.showUnauthenticatedContent();
        }
    }

    async verifyToken(token) {
        try {
            const response = await fetch('/api/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showAuthenticatedContent();
            } else {
                this.showUnauthenticatedContent();
            }
        } catch (error) {
            console.error('Erro na verificação do token:', error);
            this.showUnauthenticatedContent();
        }
    }

    showAuthenticatedContent() {
        const authSection = document.getElementById('auth-section');
        const yearEventSelector = document.getElementById('year-event-selector');

        if (authSection) {
            authSection.style.display = 'block';
        }
        if (yearEventSelector) {
            yearEventSelector.style.display = 'block';
        }
    }

    showUnauthenticatedContent() {
        const authSection = document.getElementById('auth-section');
        const yearEventSelector = document.getElementById('year-event-selector');

        if (authSection) {
            authSection.style.display = 'none';
        }
        if (yearEventSelector) {
            yearEventSelector.style.display = 'none';
        }
    }

    async logout() {
        try {
            const token = this.appState.currentToken;
            if (token) {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            sessionManager.remove('auth_token');
            sessionManager.remove('congregation');
            this.appState.setAuth(null, null);
            this.notifications.show('Logout realizado com sucesso!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }
}

// ========================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ========================================

class App {
    constructor() {
        this.appState = new AppState();
        this.notifications = new NotificationSystem();
        this.dataService = new DataService(this.appState, this.notifications);
        this.authManager = new AuthManager(this.appState, this.notifications);
        this.passengerManager = new PassengerManager(this.appState, this.dataService, this.notifications);
    }

    async init() {
        try {
            LoadingSystem.show();

            // Verifica autenticação
            this.authManager.checkAuthentication();

            // Aplica configuração do arranjo
            this.applyArrangement();

            // Carrega dados
            await this.dataService.loadData();

            // Atualiza display
            this.passengerManager.updateDisplay();

            // Setup global handlers
            this.setupGlobalEventListeners();

            LoadingSystem.hide();

        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.notifications.show('Erro ao inicializar aplicação.', 'error');
            LoadingSystem.hide();
        }
    }

    applyArrangement() {
        const arrangement = JSON.parse(sessionManager.get('arrangement') || 'null');
        if (arrangement) {
            this.appState.setArrangement(arrangement);
            this.updateArrangementDisplay(arrangement);
        }
    }

    updateArrangementDisplay(arrangement) {
        // Atualiza labels de veículos
        const vehicleType = arrangement.vehicleType === 'van' ? 'Vans' : 'Ônibus';
        const seatCount = arrangement.seatCount || CONFIG.DEFAULT_SEAT_COUNT;

        ['friday', 'saturday', 'sunday'].forEach(day => {
            const label = document.getElementById(`${day}-vehicle-label`);
            if (label) {
                label.textContent = `${vehicleType} Necessárias (${seatCount} vagas):`;
            }
        });

        // Atualiza outras informações se necessário
        const eventInfo = document.getElementById('event-info');
        if (eventInfo && arrangement.dates) {
            const eventType = arrangement.eventType === 'congress' ? 'Congresso' : 'Assembleia';
            eventInfo.textContent = `${eventType} - ${vehicleType} (${seatCount} lugares)`;
        }
    }

    setupGlobalEventListeners() {
        // Escape key para fechar notificações
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.notifications.hide();
            }
        });

        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Erro global:', event.error);
            this.notifications.show('Ocorreu um erro inesperado.', 'error');
        });

        // Unhandled promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promise rejeitada:', event.reason);
            this.notifications.show('Erro de conectividade.', 'error');
        });
    }
}

// ========================================
// INSTÂNCIAS GLOBAIS (para compatibilidade)
// ========================================

let app;
let passengerManager;
let authManager;

// ========================================
// INICIALIZAÇÃO QUANDO DOM CARREGADO
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    app = new App();
    passengerManager = app.passengerManager;
    authManager = app.authManager;

    await app.init();
});

// ========================================
// FUNÇÕES GLOBAIS (para compatibilidade com HTML inline)
// ========================================

function editPassenger(passengerId) {
    if (passengerManager) {
        passengerManager.editPassenger(passengerId);
    }
}

function deletePassenger(passengerId) {
    if (passengerManager) {
        passengerManager.deletePassenger(passengerId);
    }
}

function logout() {
    if (authManager) {
        authManager.logout();
    }
}

// Exporta para uso em outros módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App, Utils, NotificationSystem, LoadingSystem };
}