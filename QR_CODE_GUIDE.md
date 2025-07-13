# 📱 QR Code Generator - Cafeteira IoT

## 🚀 Novos Recursos Implementados

### 1. **QR Code com Valor Editável**
- O usuário pode digitar qualquer valor ao escanear
- Ideal para doações flexíveis
- Endpoint: `POST /generate-qr`

### 2. **QR Code com Valor Fixo**
- Valor pré-definido no QR Code
- Útil para valores específicos (ex: preço do café)
- Endpoint: `POST /generate-qr-fixed`

### 3. **Página Web Interativa**
- Interface bonita com QR Code
- Status da cafeteira em tempo real
- Endpoint: `GET /qr-page`

## 🛠️ Como Usar

### Via Script de Teste

```bash
# Gerar QR Code editável
node test-webhook.js generate-qr

# Gerar QR Code fixo (R$ 10,00)
node test-webhook.js generate-qr-fixed 10.00

# Abrir página web
node test-webhook.js open-qr-page
```

### Via API Direta

#### 1. QR Code Editável
```bash
curl -X POST https://sua-url.vercel.app/generate-qr \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Doação para Cafeteira IoT",
    "externalReference": "cafe-001"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "payment": {
    "id": "123456789",
    "qr_code": "00020126580014br.gov.bcb.pix...",
    "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "status": "pending"
  },
  "message": "QR Code gerado com sucesso! O usuário pode editar o valor ao pagar."
}
```

#### 2. QR Code Valor Fixo
```bash
curl -X POST https://sua-url.vercel.app/generate-qr-fixed \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5.00,
    "description": "Café Premium - R$ 5,00",
    "payerEmail": "cliente@exemplo.com"
  }'
```

#### 3. Página Web
```
GET https://sua-url.vercel.app/qr-page
```

## 📱 Fluxo de Pagamento

### QR Code Editável:
1. **API gera QR Code** com valor mínimo (R$ 0,01)
2. **Usuário escaneia** o QR Code
3. **App do banco permite editar** o valor
4. **Usuário digita** o valor desejado
5. **Confirma o pagamento**
6. **Webhook é disparado** automaticamente
7. **Cafeteira é atualizada** em tempo real

### QR Code Fixo:
1. **API gera QR Code** com valor específico
2. **Usuário escaneia** e paga o valor fixo
3. **Webhook processa** o pagamento
4. **Cafeteira é atualizada**

## 🎨 Página Web Interativa

A página `/qr-page` inclui:

- ☕ **Design temático** (cores de café)
- 📱 **QR Code responsivo**
- 📊 **Status em tempo real** da cafeteira
- 💡 **Instruções claras** para o usuário
- 🔄 **Atualização automática** a cada 5 segundos

### Features da Página:
- Total arrecadado
- Número de doações
- Última doação (valor + nome)
- QR Code interativo
- Design mobile-friendly

## 🔧 Configuração para ESP32

O ESP32 pode usar o endpoint `/coffee-status` para:

```cpp
void checkCoffeeStatus() {
  HTTPClient http;
  http.begin("https://sua-url.vercel.app/coffee-status");
  
  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    
    // Parse JSON
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    float total = doc["total"];
    int count = doc["count"];
    String lastDonor = doc["lastDonation"]["donor"];
    
    // Atualizar display LCD
    updateDisplay(total, count, lastDonor);
  }
  
  http.end();
}
```

## 🚀 Deploy

```bash
# Commit das mudanças
git add -A
git commit -m "Adiciona geração de QR Code PIX"

# Deploy no Vercel
vercel --prod
```

## 📋 Endpoints Completos

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/` | GET | Status do servidor |
| `/webhook` | POST | Recebe notificações MP |
| `/coffee-status` | GET | Status da cafeteira |
| `/generate-qr` | POST | QR Code editável |
| `/generate-qr-fixed` | POST | QR Code valor fixo |
| `/qr-page` | GET | Página web interativa |
| `/reset` | POST | Resetar dados |

## 💡 Dicas de Uso

1. **Para cafeteria física**: Use QR Code fixo com preços específicos
2. **Para doações**: Use QR Code editável para flexibilidade
3. **Para display público**: Use a página web em tablet/monitor
4. **Para ESP32**: Consulte `/coffee-status` a cada 10-30 segundos

## 🐛 Troubleshooting

### QR Code não aparece:
- Verifique se `MP_ACCESS_TOKEN` está configurado
- Confirme conectividade com Mercado Pago
- Teste com `node test-webhook.js test-mp`

### Webhook não funciona:
- Verifique URL do webhook no painel MP
- Confirme se Vercel está deployado
- Monitore logs no Vercel Dashboard

### Valor não é editável:
- Alguns apps podem não permitir edição
- Teste com diferentes bancos
- Use QR Code fixo como alternativa
