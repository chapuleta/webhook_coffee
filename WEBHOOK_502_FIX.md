# Fix para Erro 502 no Webhook

## Problema Identificado

O webhook estava retornando erro 502 (Bad Gateway) no Mercado Pago, mesmo que o servidor estivesse funcionando.

## Causa Raiz

O problema estava relacionado a:

1. **Resposta JSON complexa** pode causar problemas de serialização no Vercel
2. **Processamento assíncrono com await** no handler principal
3. **Headers JSON** podem não ser esperados pelo Mercado Pago
4. **Timeout** em operações síncronas dentro do handler

## Solução Implementada

### ✅ Resposta Simples e Rápida

```javascript
app.post('/webhook', (req, res) => {
  // RESPOSTA IMEDIATA - não usar async/await aqui
  res.status(200).send('OK');
  
  // Processamento assíncrono APÓS responder
  process.nextTick(async () => {
    // Todo o processamento aqui...
  });
});
```

### 🔧 Principais Mudanças:

1. **Resposta em texto simples**: `res.status(200).send('OK')` em vez de JSON
2. **Sem async/await** no handler principal - responde imediatamente
3. **Processamento assíncrono**: Usa `process.nextTick()` para processar após responder
4. **Logs detalhados**: Mantém todos os logs para debugging
5. **Error handling isolado**: Erros no processamento não afetam a resposta

### 📊 Comparação:

#### ❌ Antes (com erro 502):
```javascript
app.post('/webhook', async (req, res) => {
  // Processamento síncrono...
  await getPaymentDetails(paymentId);
  
  // Resposta JSON complexa
  res.status(200).json({ 
    success: true,
    message: 'Webhook recebido',
    timestamp: new Date().toISOString()
  });
});
```

#### ✅ Depois (sem erro 502):
```javascript
app.post('/webhook', (req, res) => {
  // Resposta IMEDIATA em texto simples
  res.status(200).send('OK');
  
  // Processamento DEPOIS da resposta
  process.nextTick(async () => {
    await getPaymentDetails(paymentId);
    // Todo processamento aqui...
  });
});
```

## Como Funciona Agora

1. **Mercado Pago envia webhook** → Servidor responde "OK" instantaneamente
2. **Servidor processa** → Busca detalhes do pagamento de forma assíncrona
3. **Se aprovado** → Atualiza dados da cafeteira
4. **Logs detalhados** → Tudo é registrado para debugging

## Vantagens

- ✅ **Sem erro 502** - Mercado Pago recebe resposta rápida
- ✅ **Processamento completo** - Todos os pagamentos são processados
- ✅ **Logs mantidos** - Debug continua funcionando
- ✅ **Performance** - Não bloqueia a resposta do webhook
- ✅ **Compatibilidade** - Funciona com diferentes versões da API do MP

## Teste

Para testar se está funcionando:

```bash
# 1. Gerar QR Code
node test-webhook.js generate-qr

# 2. Fazer pagamento PIX

# 3. Verificar logs (não deve ter erro 502)

# 4. Verificar status
node test-webhook.js coffee-status
```

## Webhook Payload Suportado

O webhook continua suportando todos os formatos:

```json
{
  "action": "payment.updated",
  "api_version": "v1",
  "data": {
    "id": "117921311737"
  },
  "date_created": "2025-07-13T05:28:30Z",
  "id": 122862896291,
  "live_mode": true,
  "type": "payment",
  "user_id": "113476843"
}
```

## Monitoramento

Use os logs para verificar:

- 🔔 Webhook recebido
- 💰 Processamento de pagamento
- ✅ Pagamento aprovado
- ❌ Erros (se houver)

Agora o webhook deve funcionar sem erro 502! 🎉
