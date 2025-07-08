# Servidor Ponte - Cafeteira IoT

Este é o servidor ponte que faz a comunicação entre a API do Mercado Pago e o ESP32 da cafeteira.

## 🚀 Deploy na Vercel

### 1. Preparação
```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar o arquivo .env com suas credenciais
```

### 2. Deploy
```bash
# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Fazer deploy
vercel

# Configurar variável de ambiente na Vercel
vercel env add MP_ACCESS_TOKEN
# Cole seu token do Mercado Pago quando solicitado
```

### 3. Configurar Webhook no Mercado Pago
Após o deploy, configure a URL do webhook no painel do Mercado Pago:
```
https://seu-projeto.vercel.app/webhook
```

## 📡 Endpoints Disponíveis

### `GET /`
Endpoint de teste para verificar se o servidor está funcionando.

### `POST /webhook`
Recebe notificações do Mercado Pago quando um pagamento é processado.

### `GET /coffee-status`
Retorna o status atual da cafeteira (usado pelo ESP32).

Resposta:
```json
{
  "total": "25.50",
  "lastDonation": {
    "amount": "5.00",
    "date": "2025-07-08T10:30:00.000Z",
    "donor": "João"
  },
  "count": 5,
  "lastUpdate": "2025-07-08T10:30:00.000Z"
}
```

### `POST /reset`
Reseta todos os dados da cafeteira (útil para testes).

## 🧪 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor em modo desenvolvimento
npm run dev

# O servidor estará disponível em http://localhost:3000
```

## 🔒 Variáveis de Ambiente

- `MP_ACCESS_TOKEN`: Token de acesso do Mercado Pago

## 📝 Logs

O servidor registra todas as transações e eventos importantes no console para facilitar o monitoramento.
