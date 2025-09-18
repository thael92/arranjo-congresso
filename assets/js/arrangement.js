document.addEventListener('DOMContentLoaded', function() {
    // Elementos do formulário
    const form = document.getElementById('event-form');
    const eventTypeSelect = document.getElementById('event-type');
    const eventYearSelect = document.getElementById('event-year');

    // Seções condicionais
    const assemblyDates = document.getElementById('assembly-dates');
    const congressDates = document.getElementById('congress-dates');
    const assemblyPrices = document.getElementById('assembly-prices');
    const congressPrices = document.getElementById('congress-prices');

    // Inicializar
    initializeYearSelect();
    setupEventHandlers();
    checkIfEditing();

    function initializeYearSelect() {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 2; year <= currentYear + 5; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            eventYearSelect.appendChild(option);
        }
    }

    function setupEventHandlers() {
        // Mudar tipo de evento
        eventTypeSelect.addEventListener('change', function() {
            toggleEventSections();
        });

        // Submit do formulário
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveEvent();
        });
    }

    function toggleEventSections() {
        const eventType = eventTypeSelect.value;

        if (eventType === 'assembly') {
            // Mostrar seções da assembleia
            assemblyDates.style.display = 'block';
            congressDates.style.display = 'none';
            assemblyPrices.style.display = 'block';
            congressPrices.style.display = 'none';
        } else if (eventType === 'congress') {
            // Mostrar seções do congresso
            assemblyDates.style.display = 'none';
            congressDates.style.display = 'block';
            assemblyPrices.style.display = 'none';
            congressPrices.style.display = 'block';
        } else {
            // Esconder todas as seções
            assemblyDates.style.display = 'none';
            congressDates.style.display = 'none';
            assemblyPrices.style.display = 'none';
            congressPrices.style.display = 'none';
        }
    }

    function checkIfEditing() {
        const editingEventId = sessionManager.get('editing_event_id');
        const editingEventData = sessionManager.get('editing_event_data');

        if (editingEventId && editingEventData) {
            const eventData = JSON.parse(editingEventData);
            populateForm(eventData);
        }
    }

    function populateForm(eventData) {
        document.getElementById('event-name').value = eventData.event_name || '';
        document.getElementById('event-year').value = eventData.year || '';
        document.getElementById('event-type').value = eventData.event_type || '';
        document.getElementById('vehicle-type').value = eventData.vehicle_type || '';
        document.getElementById('seat-count').value = eventData.seat_count || 16;

        // Trigger mudança de tipo para mostrar seções corretas
        toggleEventSections();

        // Preencher datas e preços
        if (eventData.dates && eventData.prices) {
            if (eventData.event_type === 'assembly') {
                const assemblyDate = eventData.dates[0];
                if (assemblyDate) {
                    document.getElementById('assembly-date').value = assemblyDate.date;
                    document.getElementById('assembly-price').value = eventData.prices[assemblyDate.day] || '50.00';
                }
            } else if (eventData.event_type === 'congress') {
                eventData.dates.forEach((dateInfo, index) => {
                    const dayNum = index + 1;
                    const dateInput = document.getElementById(`day${dayNum}-date`);
                    const priceInput = document.getElementById(`day${dayNum}-price`);

                    if (dateInput) {
                        dateInput.value = dateInfo.date;
                    }
                    if (priceInput) {
                        priceInput.value = eventData.prices[dateInfo.day] || '50.00';
                    }
                });
            }
        }
    }

    async function saveEvent() {
        const token = sessionManager.get('auth_token');
        if (!token) {
            showNotification('Erro: Usuário não autenticado', 'error');
            return;
        }

        try {
            // Coletar dados do formulário
            const eventData = collectFormData();

            // Validar dados
            if (!validateEventData(eventData)) {
                return;
            }

            // Verificar se é edição ou criação
            const editingEventId = sessionManager.get('editing_event_id');
            const isEditing = !!editingEventId;

            showNotification('Salvando evento...', 'info');

            let response;
            let url;
            let method;

            if (isEditing) {
                url = `/api/events/event/${editingEventId}`;
                method = 'PUT';
            } else {
                url = '/api/events';
                method = 'POST';
            }

            response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventData)
            });

            if (response.ok) {
                const result = await response.json();

                // Limpar dados de edição
                sessionManager.remove('editing_event_id');
                sessionManager.remove('editing_event_data');

                showNotification(
                    isEditing ? 'Evento atualizado com sucesso!' : 'Evento criado com sucesso!',
                    'success'
                );

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao salvar evento');
            }
        } catch (error) {
            console.error('Erro ao salvar evento:', error);
            showNotification(`Erro ao salvar evento: ${error.message}`, 'error');
        }
    }

    function collectFormData() {
        const eventType = document.getElementById('event-type').value;

        const baseData = {
            year: parseInt(document.getElementById('event-year').value),
            event_type: eventType,
            event_name: document.getElementById('event-name').value,
            vehicle_type: document.getElementById('vehicle-type').value,
            seat_count: parseInt(document.getElementById('seat-count').value),
            attendees_data: {},
            prices: {}
        };

        if (eventType === 'assembly') {
            const date = document.getElementById('assembly-date').value;
            const price = document.getElementById('assembly-price').value;

            baseData.dates = [
                { day: 'sunday', date: date, label: 'Assembleia' }
            ];
            baseData.prices = { sunday: price };
            baseData.attendees_data = { sunday: [] };

        } else if (eventType === 'congress') {
            const dates = [];
            const prices = {};
            const attendees_data = {};

            const days = ['friday', 'saturday', 'sunday'];
            const dayLabels = ['1º Dia', '2º Dia', '3º Dia'];

            for (let i = 0; i < 3; i++) {
                const date = document.getElementById(`day${i+1}-date`).value;
                const price = document.getElementById(`day${i+1}-price`).value;

                dates.push({
                    day: days[i],
                    date: date,
                    label: dayLabels[i]
                });

                prices[days[i]] = price;
                attendees_data[days[i]] = [];
            }

            baseData.dates = dates;
            baseData.prices = prices;
            baseData.attendees_data = attendees_data;
        }

        return baseData;
    }

    function validateEventData(data) {
        // Validações básicas
        if (!data.event_name.trim()) {
            showNotification('Por favor, informe o nome do evento', 'error');
            return false;
        }

        if (!data.year || data.year < 2020 || data.year > 2030) {
            showNotification('Por favor, selecione um ano válido', 'error');
            return false;
        }

        if (!data.event_type) {
            showNotification('Por favor, selecione o tipo de evento', 'error');
            return false;
        }

        if (!data.vehicle_type) {
            showNotification('Por favor, selecione o tipo de transporte', 'error');
            return false;
        }

        if (!data.seat_count || data.seat_count < 1) {
            showNotification('Por favor, informe a quantidade de lugares', 'error');
            return false;
        }

        // Validar datas
        if (!data.dates || data.dates.length === 0) {
            showNotification('Por favor, informe as datas do evento', 'error');
            return false;
        }

        for (let dateInfo of data.dates) {
            if (!dateInfo.date) {
                showNotification('Por favor, preencha todas as datas', 'error');
                return false;
            }
        }

        // Validar preços
        for (let day in data.prices) {
            const price = parseFloat(data.prices[day]);
            if (isNaN(price) || price < 0) {
                showNotification('Por favor, informe preços válidos', 'error');
                return false;
            }
        }

        return true;
    }

    // Função para mostrar notificações
    function showNotification(message, type) {
        const notificationArea = document.getElementById('notification-area');

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        notificationArea.appendChild(notification);

        // Auto remover após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
});