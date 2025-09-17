// ========================================
// INDEX.JS - SISTEMA DE EVENTOS E PASSAGEIROS
// ========================================

'use strict';

// Estado global para eventos
let currentEvent = null;
let currentYear = null;
let events = [];

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Inicializando sistema...');

        // Sempre inicia com tela de boas-vindas
        showUnauthenticatedView();

        showNotification('Sistema inicializado com sucesso!', 'success', 2000);

        // Verifica autenticação em segundo plano
        const isAuthenticated = await checkAuthentication();
        if (isAuthenticated) {
            await loadAllEvents();
        }

        setupEventListeners();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showNotification('Erro ao inicializar sistema. Recarregue a página.', 'error');
    }
});

// ========================================
// AUTENTICAÇÃO
// ========================================

async function checkAuthentication() {
    const token = localStorage.getItem('auth_token');
    const congregation = localStorage.getItem('congregation');

    if (!token || !congregation) {
        showUnauthenticatedView();
        return false;
    }

    try {
        const response = await fetch('/api/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            showAuthenticatedView(JSON.parse(congregation));
            return true;
        } else {
            showUnauthenticatedView();
            return false;
        }
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        showUnauthenticatedView();
        return false;
    }
}

function showAuthenticatedView(congregation) {
    // Esconde tela de boas-vindas
    document.getElementById('welcome-screen').style.display = 'none';

    // Mostra seção autenticada
    document.getElementById('authenticated-section').style.display = 'block';
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('events-selector').style.display = 'block';

    // Atualiza informações da congregação
    document.getElementById('congregation-name').textContent = congregation.name;
    document.getElementById('congregation-email').textContent = congregation.email;
}

function showUnauthenticatedView() {
    // Mostra tela de boas-vindas
    document.getElementById('welcome-screen').style.display = 'block';

    // Esconde seção autenticada
    document.getElementById('authenticated-section').style.display = 'none';
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('events-selector').style.display = 'none';
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('passenger-form').style.display = 'none';
    document.getElementById('results-grid').style.display = 'none';
}

// ========================================
// GERENCIAMENTO DE EVENTOS
// ========================================

async function loadAllEvents() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
        // Primeiro busca os anos disponíveis
        const yearsResponse = await fetch('/api/events/years', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (yearsResponse.ok) {
            const availableYears = await yearsResponse.json();
            console.log('Anos disponíveis:', availableYears);

            // Atualiza o seletor de anos
            updateYearSelector(availableYears);

            // Se há anos disponíveis, carrega o mais recente
            if (availableYears.length > 0) {
                currentYear = availableYears[0]; // Anos vêm ordenados DESC
                document.getElementById('year-select').value = currentYear;
                await loadEventsForYear(currentYear);
            } else {
                // Nenhum evento encontrado
                updateEventsDisplay([]);
                showNotification('Nenhum evento cadastrado ainda. Crie seu primeiro evento!', 'info');
            }
        } else {
            console.error('Erro ao carregar anos disponíveis:', yearsResponse.status);
            updateEventsDisplay([]);
        }
    } catch (error) {
        console.error('Erro ao conectar com servidor:', error);
        updateEventsDisplay([]);
        showNotification('Erro de conexão. Verifique sua internet.', 'error');
    }
}

function updateYearSelector(availableYears) {
    const yearSelect = document.getElementById('year-select');
    if (!yearSelect) return;

    // Limpa opções atuais
    yearSelect.innerHTML = '<option value="">Selecione um ano</option>';

    // Adiciona anos disponíveis
    availableYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    // Se não há eventos, adiciona alguns anos comuns
    if (availableYears.length === 0) {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 1; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }
}

async function loadEventsForYear(year) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        showNotification('Token de autenticação não encontrado', 'error');
        return;
    }

    try {
        showNotification(`Carregando eventos de ${year}...`, 'info', 1000);

        const response = await fetch(`/api/events/${year}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            events = await response.json();
            console.log('Eventos carregados:', events);

            if (events.length > 0) {
                showNotification(`${events.length} evento(s) encontrado(s) para ${year}`, 'success');
            } else {
                showNotification(`Nenhum evento encontrado para ${year}`, 'info');
            }

            updateEventsDisplay(events);
        } else {
            const errorData = await response.json();
            console.error('Erro na resposta:', errorData);
            showNotification(`Erro ao carregar eventos: ${errorData.error || 'Erro desconhecido'}`, 'error');
            events = [];
            updateEventsDisplay([]);
        }
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        showNotification('Erro de conexão ao carregar eventos', 'error');
        events = [];
        updateEventsDisplay([]);
    }
}

function updateEventsDisplay(eventsList) {
    const eventsGrid = document.getElementById('events-grid');
    const eventsList_ = document.getElementById('events-list');

    if (eventsList.length === 0) {
        eventsList_.style.display = 'none';
        eventsGrid.innerHTML = '<p class="text-center text-muted">Nenhum evento encontrado para este ano.</p>';
        return;
    }

    eventsList_.style.display = 'block';
    eventsGrid.innerHTML = '';

    eventsList.forEach(event => {
        const eventCard = createEventCard(event);
        eventsGrid.appendChild(eventCard);
    });
}

function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card fade-in';
    card.onclick = () => selectEvent(event.id);

    const eventType = event.event_type === 'congress' ? 'Congresso' : 'Assembleia';
    const vehicleType = event.vehicle_type === 'van' ? 'Van' : 'Ônibus';
    const currentYear = new Date().getFullYear();

    // Determinar cor do ano baseado no tempo
    let yearBadgeClass = 'year-current';
    let yearLabel = '';

    if (event.year > currentYear) {
        yearBadgeClass = 'year-future';
        yearLabel = '(Futuro)';
    } else if (event.year < currentYear) {
        yearBadgeClass = 'year-past';
        yearLabel = '(Passado)';
    } else {
        yearBadgeClass = 'year-current';
        yearLabel = '(Atual)';
    }

    // Formatar datas
    const datesHtml = event.dates.map(dateInfo => {
        const date = new Date(dateInfo.date + 'T00:00:00');
        const dayName = getDayName(dateInfo.day);
        return `<div><strong>${dayName}:</strong> ${date.toLocaleDateString('pt-BR')}</div>`;
    }).join('');

    card.innerHTML = `
        <div class="event-title">
            <h4>${event.event_name}</h4>
            <div class="event-year-badge ${yearBadgeClass}">
                ${event.year} ${yearLabel}
            </div>
        </div>
        <div class="event-info">
            <strong>Tipo:</strong> ${eventType}<br>
            <strong>Veículo:</strong> ${vehicleType} (${event.seat_count} lugares)
        </div>
        <div class="event-dates">
            ${datesHtml}
        </div>
        <div class="event-actions">
            <button class="btn btn-primary btn-sm select-event-btn" data-event-id="${event.id}">
                Gerenciar Passageiros
            </button>
            <button class="btn btn-warning btn-sm edit-event-btn" data-event-id="${event.id}">
                Editar
            </button>
            <button class="btn btn-danger btn-sm delete-event-btn" data-event-id="${event.id}">
                Excluir
            </button>
        </div>
    `;

    // Adicionar event listeners
    const selectBtn = card.querySelector('.select-event-btn');
    const editBtn = card.querySelector('.edit-event-btn');
    const deleteBtn = card.querySelector('.delete-event-btn');

    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectEvent(event.id);
    });

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editEvent(event.id);
    });

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteEvent(event.id, e.target);
    });

    return card;
}

function getDayName(day) {
    const dayNames = {
        'friday': 'Sexta-feira',
        'saturday': 'Sábado',
        'sunday': 'Domingo',
        'day1': 'Primeiro dia',
        'day2': 'Segundo dia',
        'day3': 'Terceiro dia',
        'assembly': 'Assembleia'
    };
    return dayNames[day] || day;
}

// ========================================
// SELEÇÃO E GERENCIAMENTO DE EVENTOS
// ========================================

async function selectEvent(eventId) {
    try {
        console.log('Selecionando evento:', eventId);
        console.log('Eventos disponíveis:', events);

        const event = events.find(e => e.id == eventId); // Usar == para comparação flexível
        if (!event) {
            showNotification(`Evento com ID ${eventId} não encontrado. Recarregando lista...`, 'error');
            await loadEventsForYear(currentYear);
            return;
        }

        currentEvent = event;
        showNotification(`Evento "${event.event_name}" selecionado com sucesso!`, 'success');

        // Atualiza display para mostrar formulário de passageiros
        document.getElementById('events-selector').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('passenger-form').style.display = 'block';

        // Configura interface baseada no tipo de evento
        setupEventInterface(event);

        // Carrega passageiros existentes
        await loadPassengers(eventId);

        // Mostra grid de resultados
        document.getElementById('results-grid').style.display = 'grid';

    } catch (error) {
        console.error('Erro ao selecionar evento:', error);
        showNotification('Erro ao selecionar evento. Tente novamente.', 'error');
    }
}

function setupEventInterface(event) {
    // Configura preços baseado nos dias do evento
    const prices = event.prices;

    if (event.event_type === 'assembly') {
        // Para assembleia, usa preço único
        const assemblyPrice = prices.sunday || prices.assembly || '50.00';
        document.getElementById('sunday-price').value = assemblyPrice;
    } else {
        // Para congresso, configura todos os preços
        document.getElementById('friday-price').value = prices.friday || prices.day1 || '50.00';
        document.getElementById('saturday-price').value = prices.saturday || prices.day2 || '50.00';
        document.getElementById('sunday-price').value = prices.sunday || prices.day3 || '50.00';
    }

    // Configura checkboxes baseado no tipo de evento
    const dayCheckboxes = document.querySelectorAll('input[name="days"]');

    if (event.event_type === 'assembly') {
        // Para assembleia, apenas domingo/assembly
        dayCheckboxes.forEach(checkbox => {
            if (checkbox.value === 'sunday' || checkbox.value === 'assembly') {
                checkbox.style.display = 'inline';
                checkbox.parentElement.style.display = 'inline-block';
            } else {
                checkbox.style.display = 'none';
                checkbox.parentElement.style.display = 'none';
            }
        });
    } else {
        // Para congresso, todos os dias
        dayCheckboxes.forEach(checkbox => {
            checkbox.style.display = 'inline';
            checkbox.parentElement.style.display = 'inline-block';
        });
    }

    // Atualiza labels de veículos
    const vehicleType = event.vehicle_type === 'van' ? 'Vans' : 'Ônibus';
    event.dates.forEach(dateInfo => {
        const dayKey = mapEventDayToInterface(dateInfo.day);
        const label = document.getElementById(`${dayKey}-vehicle-label`);
        if (label) {
            label.textContent = `${vehicleType} Necessárias (${event.seat_count} vagas):`;
        }
    });

    // Esconde colunas não utilizadas
    if (event.event_type === 'assembly') {
        document.getElementById('friday-col').style.display = 'none';
        document.getElementById('saturday-col').style.display = 'none';
        document.getElementById('sunday-col').style.display = 'block';
    } else {
        document.getElementById('friday-col').style.display = 'block';
        document.getElementById('saturday-col').style.display = 'block';
        document.getElementById('sunday-col').style.display = 'block';
    }
}

// Função para mapear dias do evento para interface
function mapEventDayToInterface(eventDay) {
    const dayMapping = {
        'day1': 'friday',
        'day2': 'saturday',
        'day3': 'sunday',
        'assembly': 'sunday',
        'friday': 'friday',
        'saturday': 'saturday',
        'sunday': 'sunday'
    };
    return dayMapping[eventDay] || eventDay;
}

async function loadPassengers(eventId) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        showNotification('Token de autenticação não encontrado', 'error');
        return;
    }

    try {
        console.log('Carregando passageiros para evento:', eventId);

        const response = await fetch(`/api/events/${eventId}/passengers`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const passengers = await response.json();
            console.log('Passageiros carregados:', passengers);

            displayPassengers(passengers);
            updateStatistics();

            if (passengers.length > 0) {
                showNotification(`${passengers.length} passageiro(s) carregado(s)`, 'success', 2000);
            } else {
                showNotification('Nenhum passageiro cadastrado ainda', 'info', 2000);
            }
        } else {
            const errorData = await response.json();
            console.error('Erro na resposta ao carregar passageiros:', errorData);
            showNotification(`Erro ao carregar passageiros: ${errorData.error || 'Erro desconhecido'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar passageiros:', error);
        showNotification('Erro de conexão ao carregar passageiros', 'error');
    }
}

function displayPassengers(passengers) {
    // Organiza passageiros por dia de interface
    const passengersByDay = {
        friday: [],
        saturday: [],
        sunday: []
    };

    passengers.forEach(passenger => {
        passenger.days_attending.forEach(day => {
            // Mapeia o dia do evento para dia da interface
            const interfaceDay = mapEventDayToInterface(day);
            if (passengersByDay[interfaceDay]) {
                passengersByDay[interfaceDay].push(passenger);
            }
        });
    });

    // Atualiza listas visuais
    Object.keys(passengersByDay).forEach(day => {
        const listElement = document.getElementById(`${day}-list`);
        if (!listElement) return;

        listElement.innerHTML = '';

        passengersByDay[day]
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(passenger => {
                const listItem = createPassengerListItem(passenger);
                listElement.appendChild(listItem);
            });
    });
}

function createPassengerListItem(passenger) {
    const listItem = document.createElement('li');
    listItem.className = 'passenger-item slide-in';

    const statusClass = passenger.payment_status === 'paid' ? 'text-success' :
                       passenger.payment_status === 'partial' ? 'text-warning' : 'text-danger';

    const statusText = passenger.payment_status === 'paid' ? 'Pago ✓' :
                      passenger.payment_status === 'partial' ? 'Pagamento Parcial ⚠' :
                      'Pendente ❌';

    const remaining = passenger.total_owed - passenger.amount_paid;

    listItem.innerHTML = `
        <div class="passenger-name">${passenger.name}</div>
        <div class="passenger-congregation">
            <small class="text-muted">Congregação: ${passenger.identification_number || 'Não informado'}</small>
        </div>
        <div class="passenger-payment">
            Pagou: R$ ${passenger.amount_paid.toFixed(2)} de R$ ${passenger.total_owed.toFixed(2)}
            ${remaining > 0 ? `<br>Falta: R$ ${remaining.toFixed(2)}` : ''}
        </div>
        <div class="passenger-status ${statusClass}">
            <strong>${statusText}</strong>
        </div>
        <div class="passenger-actions">
            <button class="btn btn-warning btn-sm edit-passenger-btn" data-passenger-id="${passenger.id}">
                Editar
            </button>
            <button class="btn btn-danger btn-sm delete-passenger-btn" data-passenger-id="${passenger.id}">
                Excluir
            </button>
        </div>
    `;

    // Adicionar event listeners
    const editBtn = listItem.querySelector('.edit-passenger-btn');
    const deleteBtn = listItem.querySelector('.delete-passenger-btn');

    editBtn.addEventListener('click', () => editPassenger(passenger.id));
    deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        deletePassenger(passenger.id, e.target);
    });

    return listItem;
}

// ========================================
// GERENCIAMENTO DE PASSAGEIROS
// ========================================

async function addPassenger() {
    if (!currentEvent) {
        showNotification('Nenhum evento selecionado. Selecione um evento primeiro.', 'error');
        return;
    }

    const nameInput = document.getElementById('name-input');
    const identificationInput = document.getElementById('identification-input');
    const amountInput = document.getElementById('amount-input');
    const dayCheckboxes = document.querySelectorAll('input[name="days"]:checked');

    const name = nameInput.value.trim();
    // Usar número da congregação do localStorage
    const congregation = JSON.parse(localStorage.getItem('congregation') || '{}');
    const identificationNumber = congregation.congregation_number || '';
    const amountPaid = parseFloat(amountInput.value) || 0;
    const selectedDays = Array.from(dayCheckboxes).map(cb => cb.value);

    // Validações
    if (!name) {
        showNotification('Por favor, insira o nome do passageiro', 'error');
        nameInput.focus();
        return;
    }

    if (name.length < 2) {
        showNotification('Nome deve ter pelo menos 2 caracteres', 'error');
        nameInput.focus();
        return;
    }


    if (selectedDays.length === 0) {
        showNotification('Por favor, selecione pelo menos um dia', 'error');
        return;
    }

    if (amountPaid < 0) {
        showNotification('Valor pago não pode ser negativo', 'error');
        amountInput.focus();
        return;
    }

    // Calcula valor total baseado nos dias selecionados
    const prices = {
        friday: parseFloat(document.getElementById('friday-price').value) || 0,
        saturday: parseFloat(document.getElementById('saturday-price').value) || 0,
        sunday: parseFloat(document.getElementById('sunday-price').value) || 0
    };

    const totalOwed = selectedDays.reduce((sum, day) => sum + prices[day], 0);

    const token = localStorage.getItem('auth_token');
    if (!token) {
        showNotification('Token de autenticação não encontrado', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/events/${currentEvent.id}/passengers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                identification_number: identificationNumber,
                amount_paid: amountPaid,
                total_owed: totalOwed,
                days_attending: selectedDays
            })
        });

        if (response.ok) {
            showNotification(`${name} adicionado com sucesso!`, 'success');
            resetForm();
            await loadPassengers(currentEvent.id);
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao adicionar passageiro');
        }
    } catch (error) {
        console.error('Erro ao adicionar passageiro:', error);
        showNotification(`Erro ao adicionar passageiro: ${error.message}`, 'error');
    }
}

async function editPassenger(passengerId) {
    const token = localStorage.getItem('auth_token');
    if (!token || !currentEvent) {
        showNotification('Erro: Token ou evento não encontrado', 'error');
        return;
    }

    try {
        // Buscar dados do passageiro
        const response = await fetch(`/api/events/${currentEvent.id}/passengers`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar passageiros');
        }

        const passengers = await response.json();
        const passenger = passengers.find(p => p.id == passengerId);

        if (!passenger) {
            showNotification('Passageiro não encontrado', 'error');
            return;
        }

        // Criar modal de edição
        const modal = createEditPassengerModal(passenger);
        document.body.appendChild(modal);
        modal.style.display = 'flex';

    } catch (error) {
        console.error('Erro ao editar passageiro:', error);
        showNotification('Erro ao carregar dados do passageiro', 'error');
    }
}

async function deletePassenger(passengerId, button) {
    // Usar notificação personalizada em vez de confirm
    showNotification('Clique novamente para confirmar exclusão', 'warning', 5000);

    if (button.classList.contains('confirm-delete')) {
        // Segunda clique - executar exclusão
        await executeDeletePassenger(passengerId);
        button.classList.remove('confirm-delete');
        button.textContent = 'Excluir';
        button.style.backgroundColor = '';
    } else {
        // Primeiro clique - marcar para confirmação
        button.classList.add('confirm-delete');
        button.textContent = 'Confirmar?';
        button.style.backgroundColor = '#dc3545';

        // Reset após 5 segundos
        setTimeout(() => {
            button.classList.remove('confirm-delete');
            button.textContent = 'Excluir';
            button.style.backgroundColor = '';
        }, 5000);
    }
}

async function executeDeletePassenger(passengerId) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        showNotification('Token de autenticação não encontrado', 'error');
        return;
    }

    if (!currentEvent) {
        showNotification('Nenhum evento selecionado', 'error');
        return;
    }

    try {
        showNotification('Excluindo passageiro...', 'info', 1000);

        const response = await fetch(`/api/events/${currentEvent.id}/passengers/${passengerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showNotification('Passageiro excluído com sucesso!', 'success');
            await loadPassengers(currentEvent.id);
        } else {
            const error = await response.json();
            console.error('Erro na resposta:', error);
            showNotification(`Erro ao excluir passageiro: ${error.error || 'Erro desconhecido'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir passageiro:', error);
        showNotification('Erro de conexão ao excluir passageiro', 'error');
    }
}

async function updateStatistics() {
    if (!currentEvent) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
        const response = await fetch(`/api/events/${currentEvent.id}/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const stats = await response.json();
            displayStatistics(stats);
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

function displayStatistics(stats) {
    Object.keys(stats).forEach(day => {
        const stat = stats[day];

        const countElement = document.getElementById(`${day}-count`);
        const collectedElement = document.getElementById(`${day}-collected`);
        const pendingElement = document.getElementById(`${day}-pending`);
        const vehiclesElement = document.getElementById(`${day}-vans`);

        if (countElement) countElement.textContent = stat.count;
        if (collectedElement) collectedElement.textContent = `R$ ${stat.totalCollected}`;
        if (pendingElement) pendingElement.textContent = `R$ ${stat.totalPending}`;
        if (vehiclesElement) vehiclesElement.textContent = stat.vehiclesNeeded;
    });
}

function createEditPassengerModal(passenger) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const daysAttending = JSON.parse(passenger.days_attending);

    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3>Editar Passageiro</h3>

            <div class="form-group">
                <label for="edit-name">Nome:</label>
                <input type="text" id="edit-name" class="form-control" value="${passenger.name}" required>
            </div>

            <div class="form-group">
                <label for="edit-identification">Número da Congregação:</label>
                <input type="text" id="edit-identification" class="form-control" value="${passenger.identification_number || ''}" readonly>
                <small class="form-text text-muted">Número único da congregação (não editável)</small>
            </div>

            <div class="form-group">
                <label for="edit-amount">Valor Pago (R$):</label>
                <input type="number" id="edit-amount" class="form-control" value="${passenger.amount_paid}" step="0.01" min="0">
            </div>

            <div class="form-group">
                <label>Dias de participação:</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="edit-friday" value="friday" ${daysAttending.includes('friday') ? 'checked' : ''}> Sexta-feira</label>
                    <label><input type="checkbox" id="edit-saturday" value="saturday" ${daysAttending.includes('saturday') ? 'checked' : ''}> Sábado</label>
                    <label><input type="checkbox" id="edit-sunday" value="sunday" ${daysAttending.includes('sunday') ? 'checked' : ''}> Domingo</label>
                </div>
            </div>

            <div class="btn-group">
                <button id="save-passenger" class="btn btn-primary">Salvar</button>
                <button id="cancel-edit" class="btn btn-secondary">Cancelar</button>
            </div>
        </div>
    `;

    // Event listeners
    modal.querySelector('#save-passenger').addEventListener('click', async () => {
        await savePassengerChanges(passenger.id, modal);
    });

    modal.querySelector('#cancel-edit').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    return modal;
}

async function savePassengerChanges(passengerId, modal) {
    const token = localStorage.getItem('auth_token');
    if (!token || !currentEvent) {
        showNotification('Erro: Token ou evento não encontrado', 'error');
        return;
    }

    const name = modal.querySelector('#edit-name').value.trim();
    const identificationNumber = modal.querySelector('#edit-identification').value.trim();
    const amountPaid = parseFloat(modal.querySelector('#edit-amount').value) || 0;

    const selectedDays = [];
    if (modal.querySelector('#edit-friday').checked) selectedDays.push('friday');
    if (modal.querySelector('#edit-saturday').checked) selectedDays.push('saturday');
    if (modal.querySelector('#edit-sunday').checked) selectedDays.push('sunday');

    if (!name || selectedDays.length === 0) {
        showNotification('Por favor, preencha o nome e selecione pelo menos um dia', 'error');
        return;
    }

    // Calcular total baseado nos dias selecionados
    const prices = {
        friday: parseFloat(document.getElementById('friday-price').value) || 0,
        saturday: parseFloat(document.getElementById('saturday-price').value) || 0,
        sunday: parseFloat(document.getElementById('sunday-price').value) || 0
    };

    const totalOwed = selectedDays.reduce((sum, day) => sum + prices[day], 0);

    try {
        const response = await fetch(`/api/events/${currentEvent.id}/passengers/${passengerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                identification_number: identificationNumber,
                amount_paid: amountPaid,
                total_owed: totalOwed,
                days_attending: selectedDays
            })
        });

        if (response.ok) {
            showNotification('Passageiro atualizado com sucesso!', 'success');
            document.body.removeChild(modal);
            await loadPassengers(currentEvent.id);
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atualizar passageiro');
        }
    } catch (error) {
        console.error('Erro ao salvar alterações:', error);
        showNotification(`Erro ao atualizar passageiro: ${error.message}`, 'error');
    }
}

// ========================================
// UTILITÁRIOS
// ========================================

function resetForm() {
    document.getElementById('name-input').value = '';
    fillCongregationNumber();
    document.getElementById('amount-input').value = '';
    document.querySelectorAll('input[name="days"]').forEach(cb => cb.checked = false);
    document.getElementById('name-input').focus();
}

function fillCongregationNumber() {
    const congregation = JSON.parse(localStorage.getItem('congregation') || '{}');
    const identificationInput = document.getElementById('identification-input');
    if (identificationInput && congregation.congregation_number) {
        identificationInput.value = congregation.congregation_number;
    }
}

function showNotification(message, type = 'info', duration = 3000) {
    // Remove notificação anterior se existir
    const existingNotification = document.querySelector('.notification.show');
    if (existingNotification) {
        existingNotification.classList.remove('show');
    }

    // Cria ou encontra área de notificação
    let notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        notificationArea = document.createElement('div');
        notificationArea.id = 'notification-area';
        notificationArea.className = 'notification';
        document.body.appendChild(notificationArea);
    }

    // Limpa classes anteriores
    notificationArea.className = 'notification';

    // Define ícones para cada tipo
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    // Define o conteúdo
    notificationArea.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-message">${message}</span>
    `;

    // Adiciona classes
    notificationArea.classList.add(type, 'show');

    // Auto-hide se duration > 0
    if (duration > 0) {
        setTimeout(() => {
            notificationArea.classList.remove('show');
        }, duration);
    }

    console.log(`[${type.toUpperCase()}] ${message}`);
}

async function editEvent(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Salva dados para edição
    localStorage.setItem('editing_event_id', eventId);
    localStorage.setItem('editing_event_data', JSON.stringify(event));

    // Redireciona para página de arranjo
    window.location.href = 'arrangement.html';
}

async function deleteEvent(eventId, button) {
    const event = events.find(e => e.id == eventId);
    const eventName = event ? event.event_name : 'evento';

    // Usar sistema de confirmação similar aos passageiros
    showNotification(`Clique novamente para confirmar exclusão do ${eventName}`, 'warning', 5000);

    if (button.classList.contains('confirm-delete-event')) {
        await executeDeleteEvent(eventId);
        button.classList.remove('confirm-delete-event');
        button.textContent = 'Excluir';
        button.style.backgroundColor = '';
    } else {
        button.classList.add('confirm-delete-event');
        button.textContent = 'Confirmar?';
        button.style.backgroundColor = '#dc3545';

        setTimeout(() => {
            button.classList.remove('confirm-delete-event');
            button.textContent = 'Excluir';
            button.style.backgroundColor = '';
        }, 5000);
    }
}

async function executeDeleteEvent(eventId) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        showNotification('Token de autenticação não encontrado', 'error');
        return;
    }

    try {
        showNotification('Excluindo evento...', 'info', 1000);

        const response = await fetch(`/api/events/event/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showNotification('Evento excluído com sucesso!', 'success');
            await loadEventsForYear(currentYear);
        } else {
            const error = await response.json();
            console.error('Erro na resposta:', error);
            showNotification(`Erro ao excluir evento: ${error.error || 'Erro desconhecido'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir evento:', error);
        showNotification('Erro de conexão ao excluir evento', 'error');
    }
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Seletor de ano
    const yearSelect = document.getElementById('year-select');
    if (yearSelect) {
        yearSelect.addEventListener('change', async (e) => {
            const year = e.target.value;
            if (year) {
                currentYear = year;
                showNotification(`Ano ${year} selecionado`, 'info', 1500);
                await loadEventsForYear(year);
            } else {
                currentYear = null;
                document.getElementById('events-list').style.display = 'none';
                showNotification('Selecione um ano para ver os eventos', 'info');
            }
        });
    }

    // Botão novo evento
    const newEventBtn = document.getElementById('new-event-btn');
    if (newEventBtn) {
        newEventBtn.addEventListener('click', () => {
            const yearInput = document.getElementById('year-input');
            const selectedYear = yearInput.value;

            if (!selectedYear) {
                showNotification('Por favor, digite o ano para o novo evento', 'error');
                yearInput.focus();
                return;
            }

            const year = parseInt(selectedYear);
            if (year < 2020 || year > 2030) {
                showNotification('Ano deve estar entre 2020 e 2030', 'error');
                yearInput.focus();
                return;
            }

            // Salva o ano escolhido
            localStorage.setItem('event_year', selectedYear);
            localStorage.setItem('creating_new_event', 'true');
            showNotification(`Criando evento para ${selectedYear}...`, 'info', 1000);
            setTimeout(() => {
                window.location.href = 'arrangement.html';
            }, 500);
        });
    }

    // Botão atualizar eventos
    const refreshEventsBtn = document.getElementById('refresh-events-btn');
    if (refreshEventsBtn) {
        refreshEventsBtn.addEventListener('click', () => {
            showNotification('Atualizando lista de eventos...', 'info', 1000);
            loadAllEvents();
        });
    }

    // Botão adicionar passageiro
    const addBtn = document.getElementById('add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addPassenger);
    }

    // Enter no campo nome
    const nameInput = document.getElementById('name-input');
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addPassenger();
            }
        });
    }

    // Botão voltar
    const backBtn = document.getElementById('back-to-events-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('main-content').style.display = 'none';
            document.getElementById('passenger-form').style.display = 'none';
            document.getElementById('events-selector').style.display = 'block';
            document.getElementById('results-grid').style.display = 'none';
            currentEvent = null;
            showNotification('Voltando para seleção de eventos', 'info', 1500);
        });
    }

    // Botão minha conta
    const myAccountBtn = document.getElementById('my-account-btn');
    if (myAccountBtn) {
        myAccountBtn.addEventListener('click', openMyAccountModal);
    }

    // Botão logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Preencher número da congregação automaticamente
    fillCongregationNumber();

    // Preencher ano atual no campo de ano
    const yearInput = document.getElementById('year-input');
    if (yearInput && !yearInput.value) {
        yearInput.value = new Date().getFullYear();
    }

    // Permitir Enter no campo de ano para criar evento
    if (yearInput) {
        yearInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const newEventBtn = document.getElementById('new-event-btn');
                if (newEventBtn) {
                    newEventBtn.click();
                }
            }
        });
    }
}

function openMyAccountModal() {
    const congregation = JSON.parse(localStorage.getItem('congregation') || '{}');
    const modal = createMyAccountModal(congregation);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

function createMyAccountModal(congregation) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#007bff" stroke-width="2"/>
                    <circle cx="12" cy="7" r="4" stroke="#007bff" stroke-width="2"/>
                </svg>
                <h3>Minha Conta</h3>
            </div>

            <form id="account-form">
                <div class="form-group">
                    <label for="account-name">Nome da Congregação:</label>
                    <input type="text" id="account-name" class="form-control" value="${congregation.name || ''}" required>
                </div>

                <div class="form-group">
                    <label for="account-congregation-number">Número da Congregação:</label>
                    <input type="text" id="account-congregation-number" class="form-control" value="${congregation.congregation_number || ''}" placeholder="Ex: SP-001 ou 12345" maxlength="20">
                    <small class="form-text text-muted">Número único de identificação da sua congregação</small>
                </div>

                <div class="form-group">
                    <label for="account-email">Email:</label>
                    <input type="email" id="account-email" class="form-control" value="${congregation.email || ''}" required>
                </div>

                <div class="form-group">
                    <label for="account-password">Nova Senha (deixe em branco para manter atual):</label>
                    <input type="password" id="account-password" class="form-control" placeholder="Digite nova senha (opcional)">
                </div>

                <div class="form-group">
                    <label for="account-confirm-password">Confirmar Nova Senha:</label>
                    <input type="password" id="account-confirm-password" class="form-control" placeholder="Confirme a nova senha">
                </div>

                <div class="btn-group">
                    <button type="button" id="save-account" class="btn btn-primary">Salvar Alterações</button>
                    <button type="button" id="cancel-account" class="btn btn-secondary">Cancelar</button>
                </div>
            </form>
        </div>
    `;

    // Event listeners
    modal.querySelector('#save-account').addEventListener('click', async () => {
        await saveAccountChanges(modal);
    });

    modal.querySelector('#cancel-account').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    return modal;
}

async function saveAccountChanges(modal) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        showNotification('Token de autenticação não encontrado', 'error');
        return;
    }

    const name = modal.querySelector('#account-name').value.trim();
    const congregationNumber = modal.querySelector('#account-congregation-number').value.trim();
    const email = modal.querySelector('#account-email').value.trim();
    const password = modal.querySelector('#account-password').value;
    const confirmPassword = modal.querySelector('#account-confirm-password').value;

    if (!name || !email) {
        showNotification('Por favor, preencha nome e email', 'error');
        return;
    }

    if (password && password !== confirmPassword) {
        showNotification('Senhas não coincidem', 'error');
        return;
    }

    if (password && password.length < 6) {
        showNotification('Nova senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    try {
        const updateData = {
            name,
            email
        };

        if (congregationNumber) {
            updateData.congregation_number = congregationNumber;
        }

        if (password) {
            updateData.password = password;
        }

        const response = await fetch('/api/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            const updatedData = await response.json();

            // Atualizar localStorage
            localStorage.setItem('congregation', JSON.stringify({
                name: updatedData.name,
                congregation_number: updatedData.congregation_number,
                email: updatedData.email
            }));

            // Atualizar display
            document.getElementById('congregation-name').textContent = updatedData.name;
            document.getElementById('congregation-email').textContent = updatedData.email;

            showNotification('Dados atualizados com sucesso!', 'success');
            document.body.removeChild(modal);
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atualizar dados');
        }
    } catch (error) {
        console.error('Erro ao salvar alterações:', error);
        showNotification(`Erro ao atualizar dados: ${error.message}`, 'error');
    }
}

async function logout() {
    const token = localStorage.getItem('auth_token');

    try {
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
        localStorage.removeItem('auth_token');
        localStorage.removeItem('congregation');
        showNotification('Logout realizado com sucesso!', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}