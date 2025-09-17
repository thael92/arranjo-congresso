const eventTypeSelect = document.getElementById('event-type');
const singleDateGroup = document.getElementById('single-date-group');
const congressDatesGroup = document.getElementById('congress-dates-group');
const eventDateInput = document.getElementById('event-date');
const fridayDateInput = document.getElementById('friday-date');
const saturdayDateInput = document.getElementById('saturday-date');
const sundayDateInput = document.getElementById('sunday-date');
const eventDatesDisplay = document.getElementById('event-dates-display');
const datesList = document.getElementById('dates-list');
const notificationArea = document.getElementById('notification-area');

const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function showNotification(message, type = 'info', duration = 3000) {
    notificationArea.textContent = message;
    notificationArea.className = `notification ${type} show`;

    if (duration !== 0) {
        setTimeout(() => {
            notificationArea.classList.remove('show');
        }, duration);
    }
}

function formatarData(data) {
    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const ano = data.getFullYear();
    const diaSemana = diasSemana[data.getDay()];
    return `${diaSemana}, ${dia}/${mes}/${ano}`;
}

function ajustarCalendario() {
    const tipoEvento = eventTypeSelect.value;

    // Limpa os campos
    eventDateInput.value = '';
    fridayDateInput.value = '';
    saturdayDateInput.value = '';
    sundayDateInput.value = '';
    eventDatesDisplay.style.display = 'none';

    if (tipoEvento === 'assembly') {
        singleDateGroup.style.display = 'block';
        congressDatesGroup.style.display = 'none';
        document.getElementById('event-date-label').textContent = 'Data da Assembleia (Domingo)';
        document.getElementById('date-help').textContent = 'Selecione um domingo para a assembleia';
    } else {
        singleDateGroup.style.display = 'none';
        congressDatesGroup.style.display = 'block';
    }
}

function mostrarDatasEvento() {
    const tipoEvento = eventTypeSelect.value;

    if (tipoEvento === 'assembly') {
        if (eventDateInput.value) {
            const data = new Date(eventDateInput.value + 'T00:00:00');
            datesList.innerHTML = `<strong>Assembleia:</strong><br>${formatarData(data)}`;
            eventDatesDisplay.style.display = 'block';
        } else {
            eventDatesDisplay.style.display = 'none';
        }
    } else {
        if (fridayDateInput.value || saturdayDateInput.value || sundayDateInput.value) {
            let datesHtml = '<strong>Congresso:</strong><br>';

            if (fridayDateInput.value) {
                const sexta = new Date(fridayDateInput.value + 'T00:00:00');
                datesHtml += `• Sexta: ${formatarData(sexta)}<br>`;
            }
            if (saturdayDateInput.value) {
                const sabado = new Date(saturdayDateInput.value + 'T00:00:00');
                datesHtml += `• Sábado: ${formatarData(sabado)}<br>`;
            }
            if (sundayDateInput.value) {
                const domingo = new Date(sundayDateInput.value + 'T00:00:00');
                datesHtml += `• Domingo: ${formatarData(domingo)}`;
            }

            datesList.innerHTML = datesHtml;
            eventDatesDisplay.style.display = 'block';
        } else {
            eventDatesDisplay.style.display = 'none';
        }
    }
}

// Validação para assembleia (apenas domingos)
eventDateInput.addEventListener('input', (e) => {
    if (e.target.value) {
        const dataSelecionada = new Date(e.target.value + 'T00:00:00');
        const diaDaSemana = dataSelecionada.getDay();

        if (diaDaSemana !== 0) {
            showNotification('Para Assembleia, por favor, selecione um Domingo.', 'error');
            e.target.value = '';
            eventDatesDisplay.style.display = 'none';
            return;
        }
    }
    mostrarDatasEvento();
});

// Validações para congresso
fridayDateInput.addEventListener('input', (e) => {
    if (e.target.value) {
        const dataSelecionada = new Date(e.target.value + 'T00:00:00');
        const diaDaSemana = dataSelecionada.getDay();

        if (diaDaSemana !== 5) {
            showNotification('Para Sexta-feira, por favor, selecione uma Sexta.', 'error');
            e.target.value = '';
            return;
        }
    }
    mostrarDatasEvento();
});

saturdayDateInput.addEventListener('input', (e) => {
    if (e.target.value) {
        const dataSelecionada = new Date(e.target.value + 'T00:00:00');
        const diaDaSemana = dataSelecionada.getDay();

        if (diaDaSemana !== 6) {
            showNotification('Para Sábado, por favor, selecione um Sábado.', 'error');
            e.target.value = '';
            return;
        }
    }
    mostrarDatasEvento();
});

sundayDateInput.addEventListener('input', (e) => {
    if (e.target.value) {
        const dataSelecionada = new Date(e.target.value + 'T00:00:00');
        const diaDaSemana = dataSelecionada.getDay();

        if (diaDaSemana !== 0) {
            showNotification('Para Domingo, por favor, selecione um Domingo.', 'error');
            e.target.value = '';
            return;
        }
    }
    mostrarDatasEvento();
});

eventTypeSelect.addEventListener('change', ajustarCalendario);

document.getElementById('save-arrangement').addEventListener('click', async () => {
    const eventType = eventTypeSelect.value;
    const vehicleType = document.getElementById('vehicle-type').value;
    const seatCount = document.getElementById('seat-count').value;

    let dates = [];
    let eventYear = new Date().getFullYear();

    if (eventType === 'assembly') {
        if (!eventDateInput.value) {
            showNotification('Por favor, selecione a data da assembleia.', 'error');
            return;
        }
        dates = [{ date: eventDateInput.value, day: 'sunday', label: 'Assembleia' }];
        eventYear = new Date(eventDateInput.value).getFullYear();
    } else {
        if (!fridayDateInput.value || !saturdayDateInput.value || !sundayDateInput.value) {
            showNotification('Por favor, selecione todas as três datas do congresso.', 'error');
            return;
        }
        dates = [
            { date: fridayDateInput.value, day: 'friday', label: 'Sexta-feira' },
            { date: saturdayDateInput.value, day: 'saturday', label: 'Sábado' },
            { date: sundayDateInput.value, day: 'sunday', label: 'Domingo' }
        ];
        eventYear = new Date(fridayDateInput.value).getFullYear();
    }

    // Verifica se é um ano específico selecionado
    const savedYear = localStorage.getItem('event_year');
    if (savedYear) {
        eventYear = parseInt(savedYear);
        localStorage.removeItem('event_year');
    }

    // Gerar nome do evento sempre incluindo o ano
    const eventTypeText = eventType === 'assembly' ? 'Assembleia' : 'Congresso';
    const monthName = new Date(dates[0].date).toLocaleDateString('pt-BR', { month: 'long' });

    // Sempre incluir o ano no nome do evento para clareza
    const eventName = `${eventTypeText} de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${eventYear}`;

    // Verificar se está editando
    const editingEventId = localStorage.getItem('editing_event_id');
    const isEditing = !!editingEventId;

    // Salvar no novo sistema
    const token = localStorage.getItem('auth_token');
    if (token) {
        try {
            let response;
            let successMessage;

            if (isEditing) {
                // Atualizar evento existente
                response = await fetch(`/api/events/event/${editingEventId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        year: eventYear,
                        event_type: eventType,
                        event_name: eventName,
                        dates: dates,
                        vehicle_type: vehicleType,
                        seat_count: parseInt(seatCount)
                    })
                });
                successMessage = `${eventName} atualizado com sucesso!`;
            } else {
                // Criar novo evento
                response = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        year: eventYear,
                        event_type: eventType,
                        event_name: eventName,
                        dates: dates,
                        vehicle_type: vehicleType,
                        seat_count: parseInt(seatCount),
                        attendees_data: { friday: [], saturday: [], sunday: [] },
                        prices: { friday: '50.00', saturday: '50.00', sunday: '50.00' }
                    })
                });
                successMessage = `${eventName} criado com sucesso!`;
            }

            if (response.ok) {
                // Limpar dados de edição
                localStorage.removeItem('editing_event_id');
                localStorage.removeItem('editing_event_data');

                // Compatibilidade com sistema antigo
                const arrangement = {
                    eventType,
                    vehicleType,
                    seatCount: parseInt(seatCount),
                    dates,
                    eventDate: dates[0].date
                };
                localStorage.setItem('arrangement', JSON.stringify(arrangement));

                showNotification(successMessage, 'success');
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
    } else {
        // Fallback para sistema antigo
        const arrangement = {
            eventType,
            vehicleType,
            seatCount: parseInt(seatCount),
            dates,
            eventDate: dates[0].date
        };
        localStorage.setItem('arrangement', JSON.stringify(arrangement));
        showNotification('Arranjo salvo com sucesso!', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }

    localStorage.removeItem('creating_new_event');
});

// Verifica se está editando um evento
function loadEditingData() {
    const editingEventId = localStorage.getItem('editing_event_id');
    const editingEventData = localStorage.getItem('editing_event_data');

    if (editingEventId && editingEventData) {
        try {
            const event = JSON.parse(editingEventData);

            // Preenche os campos com os dados do evento
            document.getElementById('event-type').value = event.event_type;
            document.getElementById('vehicle-type').value = event.vehicle_type;
            document.getElementById('seat-count').value = event.seat_count;

            // Preenche as datas
            if (event.event_type === 'assembly' && event.dates && event.dates.length > 0) {
                document.getElementById('event-date').value = event.dates[0].date;
            } else if (event.event_type === 'congress' && event.dates && event.dates.length >= 3) {
                event.dates.forEach(dateInfo => {
                    if (dateInfo.day === 'friday') {
                        document.getElementById('friday-date').value = dateInfo.date;
                    } else if (dateInfo.day === 'saturday') {
                        document.getElementById('saturday-date').value = dateInfo.date;
                    } else if (dateInfo.day === 'sunday') {
                        document.getElementById('sunday-date').value = dateInfo.date;
                    }
                });
            }

            // Atualiza o título e botão
            document.querySelector('h1').textContent = `Editando: ${event.event_name}`;
            document.getElementById('save-arrangement').textContent = 'Salvar Alterações';

            // Mostra as datas
            mostrarDatasEvento();
        } catch (error) {
            console.error('Erro ao carregar dados de edição:', error);
            showNotification('Erro ao carregar dados do evento para edição', 'error');
        }
    }
}

// Ajusta o calendário ao carregar a página
ajustarCalendario();
loadEditingData();

// Mostrar ano selecionado
function displaySelectedYear() {
    const savedYear = localStorage.getItem('event_year');
    const currentYear = new Date().getFullYear();

    if (savedYear) {
        const yearInfo = document.getElementById('selected-year-info');
        const yearDisplay = document.getElementById('selected-year-display');

        if (yearInfo && yearDisplay) {
            yearDisplay.textContent = savedYear;

            // Destacar se for um ano futuro ou passado
            if (parseInt(savedYear) > currentYear) {
                yearDisplay.style.color = '#28a745'; // Verde para futuro
                yearDisplay.innerHTML = `${savedYear} <small>(ano futuro)</small>`;
            } else if (parseInt(savedYear) < currentYear) {
                yearDisplay.style.color = '#ffc107'; // Amarelo para passado
                yearDisplay.innerHTML = `${savedYear} <small>(ano passado)</small>`;
            } else {
                yearDisplay.style.color = '#007bff'; // Azul para atual
                yearDisplay.innerHTML = `${savedYear} <small>(ano atual)</small>`;
            }

            yearInfo.style.display = 'block';
        }
    }
}

// Executar ao carregar
displaySelectedYear();