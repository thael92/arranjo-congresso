const loginForm = document.getElementById('login-form');
const messageArea = document.getElementById('message-area');
const loginBtn = document.getElementById('login-btn');
const loading = document.getElementById('loading');

function showMessage(message, type = 'error') {
    messageArea.innerHTML = `<div class="${type}-message">${message}</div>`;
}

function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
    loading.style.display = isLoading ? 'block' : 'none';
    loginBtn.textContent = isLoading ? 'Entrando...' : 'Entrar';
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessage('Por favor, preencha todos os campos.');
        return;
    }

    setLoading(true);
    messageArea.innerHTML = '';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Salvar token no localStorage
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('congregation', JSON.stringify(data.congregation));
            
            showMessage('Login realizado com sucesso! Redirecionando...', 'success');
            
            // Redirecionar para a página principal
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            showMessage(data.error || 'Erro ao fazer login');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro de conexão. Tente novamente.');
    } finally {
        setLoading(false);
    }
});

// Verificar se já está logado
window.addEventListener('load', () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        // Verificar se o token ainda é válido
        fetch('/api/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/';
            }
        })
        .catch(() => {
            // Token inválido, remover
            localStorage.removeItem('auth_token');
            localStorage.removeItem('congregation');
        });
    }
});