const registerForm = document.getElementById('register-form');
const messageArea = document.getElementById('message-area');
const registerBtn = document.getElementById('register-btn');
const loading = document.getElementById('loading');

function showMessage(message, type = 'error') {
    messageArea.innerHTML = `<div class="${type}-message">${message}</div>`;
}

function setLoading(isLoading) {
    registerBtn.disabled = isLoading;
    loading.style.display = isLoading ? 'block' : 'none';
    registerBtn.textContent = isLoading ? 'Cadastrando...' : 'Cadastrar Congregação';
}

function validateForm() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
        showMessage('Por favor, preencha todos os campos.');
        return false;
    }

    if (name.length < 3) {
        showMessage('O nome da congregação deve ter pelo menos 3 caracteres.');
        return false;
    }

    if (password.length < 6) {
        showMessage('A senha deve ter pelo menos 6 caracteres.');
        return false;
    }

    if (password !== confirmPassword) {
        showMessage('As senhas não coincidem.');
        return false;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Por favor, insira um email válido.');
        return false;
    }

    return true;
}

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    setLoading(true);
    messageArea.innerHTML = '';

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Congregação cadastrada com sucesso! Redirecionando para o login...', 'success');
            
            // Limpar formulário
            registerForm.reset();
            
            // Redirecionar para login após 2 segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showMessage(data.error || 'Erro ao cadastrar congregação');
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

// Validação em tempo real da confirmação de senha
document.getElementById('confirmPassword').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    
    if (confirmPassword && password !== confirmPassword) {
        this.style.borderColor = '#dc3545';
    } else {
        this.style.borderColor = '#e1e1e1';
    }
});