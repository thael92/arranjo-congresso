# Sistema de Controle de Congressos

Sistema completo para gerenciamento de passageiros em congressos e assembleias de congregações.

## ✨ Funcionalidades

### 🏛️ Sistema de Congregações
- **Cadastro de Congregações**: Registro seguro com validação de email
- **Login Autenticado**: Sistema JWT com sessões seguras
- **Gerenciamento Múltiplo**: Cada congregação tem seus próprios eventos

### 📅 Gerenciamento de Eventos
- **Congressos (3 dias)**: Sexta, Sábado e Domingo
- **Assembleias (1 dia)**: Apenas Domingo
- **Validação de Datas**: Sistema inteligente que valida dias da semana
- **Configuração Flexível**: Define tipo de veículo e capacidade

### 🚌 Controle de Transporte
- **Van**: 16 lugares (padrão)
- **Ônibus**: Capacidade configurável
- **Cálculo Automático**: Quantidade de veículos necessários

### 👥 Gestão de Passageiros
- **Cadastro Completo**: Nome, valor pago, dias de participação
- **Status de Pagamento**: Pendente, Parcial, Pago
- **Edição e Exclusão**: Gerenciamento completo
- **Validações**: Campos obrigatórios e formatação

### 📊 Relatórios e Estatísticas
- **Por Dia**: Contagem, valores arrecadados e pendentes
- **Veículos Necessários**: Cálculo automático por dia
- **Status Visual**: Interface clara com cores indicativas

## 🚀 Como Usar

### 1. Configuração Inicial
```bash
# Clone o repositório
git clone [url-do-repositorio]

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Edite o .env com suas configurações

# Inicie o servidor
npm start
```

### 2. Primeiro Acesso
1. Acesse `http://localhost:3000`
2. Clique em "Cadastrar Congregação"
3. Preencha os dados da sua congregação
4. Faça login com as credenciais criadas

### 3. Criando um Evento
1. Selecione ou crie um ano
2. Clique em "Novo Evento"
3. Configure:
   - Tipo: Congresso (3 dias) ou Assembleia (1 dia)
   - Veículo: Van ou Ônibus
   - Capacidade: Número de lugares
   - Datas: Selecione as datas apropriadas

### 4. Gerenciando Passageiros
1. Selecione um evento existente
2. Configure os preços por dia
3. Adicione passageiros:
   - Nome completo
   - Valor pago
   - Dias de participação
4. Monitore estatísticas em tempo real

## 🔧 Tecnologias

### Backend
- **Node.js** + **Express.js**
- **SQLite** (banco de dados local)
- **JWT** (autenticação)
- **bcryptjs** (criptografia de senhas)
- **express-validator** (validação)

### Frontend
- **HTML5** + **CSS3** + **JavaScript ES6+**
- **Design Responsivo** (mobile-first)
- **PWA Ready** (Progressive Web App)
- **Notificações em Tempo Real**

### Segurança
- **Rate Limiting** (proteção contra ataques)
- **Helmet.js** (headers de segurança)
- **CORS** configurado
- **Validação de dados** entrada e saída

## 📁 Estrutura do Projeto

```
arranjo-congressos/
├── api/
│   ├── database.js       # Configuração do banco
│   └── server.js         # Servidor principal
├── assets/
│   ├── css/
│   │   └── main.css      # Estilos principais
│   └── js/
│       ├── main.js       # Utilitários gerais
│       ├── index.js      # Lógica principal
│       ├── login.js      # Sistema de login
│       ├── register.js   # Sistema de cadastro
│       └── arrangement.js # Configuração de eventos
├── index.html            # Página principal
├── login.html           # Página de login
├── register.html        # Página de cadastro
├── arrangement.html     # Configuração de eventos
├── package.json
├── .env.example
└── README.md
```

## 🎨 Interface

### Cores e Estilo
- **Azul Primário**: #007bff (botões e destaques)
- **Verde Sucesso**: #28a745 (confirmações)
- **Vermelho Erro**: #dc3545 (alertas)
- **Cinza Neutro**: #6c757d (textos secundários)

### Características
- **Design Moderno**: Interface limpa e profissional
- **Responsivo**: Funciona em desktop, tablet e mobile
- **Notificações**: Sistema visual de feedback
- **Animações**: Transições suaves

## 🔐 Segurança

### Autenticação
- Senhas criptografadas com bcrypt
- Tokens JWT com expiração
- Sessões controladas no banco
- Rate limiting por IP

### Validações
- Email único por congregação
- Senhas com requisitos mínimos
- Sanitização de entrada
- Validação de datas

## 📱 PWA (Progressive Web App)

O sistema pode ser instalado como app no dispositivo:
- Funciona offline (recursos básicos)
- Ícone na tela inicial
- Notificações push (futuro)

## 🚀 Deploy

### Produção
1. Configure variáveis de ambiente
2. Use PostgreSQL em vez de SQLite
3. Configure HTTPS
4. Use PM2 ou similar para processo

### Variáveis de Ambiente
```env
NODE_ENV=production
JWT_SECRET=seu_jwt_secret_super_seguro
DATABASE_URL=postgresql://...
PORT=3000
```

## 🆘 Suporte

### Problemas Comuns
1. **"Evento não encontrado"**: Recarregue a página
2. **Token expirado**: Faça login novamente
3. **Erro de conexão**: Verifique se o servidor está rodando

### Logs
Verifique o console do navegador (F12) para erros detalhados.

## 📝 Licença

Este projeto é de uso livre para congregações e organizações religiosas.

---

**Desenvolvido com ❤️ para facilitar a organização de congressos e assembleias**