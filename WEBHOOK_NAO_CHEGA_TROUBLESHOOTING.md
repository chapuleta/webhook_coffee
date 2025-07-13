# Troubleshooting: Pagamentos PIX não chegam no Vercel

## Problema Identificado

Você faz pagamentos lendo o QR Code, mas os webhooks não chegam no Vercel.

## Possíveis Causas e Soluções

### 1. **Pagamento não foi efetivamente aprovado**

**Sintoma**: QR Code é escaneado, mas webhook não chega
**Causa**: O pagamento pode estar pendente, cancelado ou rejeitado
**Solução**: Verificar o status real do pagamento

```bash
# Verificar detalhes de um pagamento específico
node test-webhook.js simulate [ID_DO_PAGAMENTO]
```

### 2. **Webhook não configurado na conta do Mercado Pago**

**Sintoma**: Pagamentos aprovados, mas webhooks não chegam
**Causa**: URL do webhook não está configurada na sua conta MP
**Solução**: Configurar manualmente no painel do Mercado Pago

#### Como configurar webhook manualmente:

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Vá em "Webhooks" ou "Notificações"
3. Adicione a URL: `https://webhook-coffee.vercel.app/webhook`
4. Selecione eventos: "Payments"

### 3. **Problema de conectividade/latência**

**Sintoma**: Webhooks chegam com atraso ou não chegam
**Causa**: Problemas de rede entre MP e Vercel
**Solução**: Verificar logs do Vercel

### 4. **Teste com valores muito baixos**

**Sintoma**: Pagamentos de R$ 0,01 não processam
**Causa**: Alguns bancos/operadoras bloqueiam valores muito baixos
**Solução**: Testar com valores maiores (R$ 1,00+)

## Como Debuggar

### 1. Verificar se o sistema está funcionando:

```bash
node test-webhook.js health
node test-webhook.js test-mp
```

### 2. Gerar um QR Code e testar:

```bash
node test-webhook.js generate-qr-fixed 5.00
# Pagar efetivamente com o app do banco
# Aguardar 30-60 segundos
node test-webhook.js coffee-status
```

### 3. Simular webhook para testar processamento:

```bash
# Substituir ID_PAGAMENTO pelo ID real do pagamento
node test-webhook.js simulate ID_PAGAMENTO
```

### 4. Verificar logs detalhados no Vercel:

- Acesse: https://vercel.com/seu-username/webhook-coffee/functions
- Procure por logs de webhook recebidos
- Verifique se há erros de processamento

## Fluxo Esperado

1. **Gerar QR Code**: Status "pending"
2. **Fazer pagamento real**: Mercado Pago processa
3. **Webhook enviado**: MP envia notificação para `/webhook`
4. **Processamento**: Vercel recebe e atualiza dados
5. **Verificar resultado**: `/coffee-status` mostra novo valor

## Logs de Debug Implementados

Agora o webhook tem logs detalhados:

- 🔔 **WEBHOOK RECEBIDO**: Headers e body completo
- 💰 **Processamento de pagamento**: ID e action
- 📊 **Detalhes do pagamento**: Status, valor, método
- ✅ **Pagamento aprovado**: Confirmação de processamento
- ⏳ **Pagamento pendente**: Status não aprovado ainda

## Teste Manual Recomendado

1. **Fazer pagamento real**: 
   ```bash
   node test-webhook.js generate-qr-fixed 2.00
   ```

2. **Escanear QR Code e pagar efetivamente** no app do banco

3. **Aguardar webhook** (até 2 minutos)

4. **Verificar resultado**:
   ```bash
   node test-webhook.js coffee-status
   ```

5. **Se não funcionar, verificar logs** no Vercel

## URLs Importantes

- **Webhook URL**: https://webhook-coffee.vercel.app/webhook
- **Página QR**: https://webhook-coffee.vercel.app/qr-page
- **Status**: https://webhook-coffee.vercel.app/coffee-status
- **Logs Vercel**: https://vercel.com/dashboard (sua conta)

## Próximos Passos

1. ✅ **Sistema está funcionando** (conectividade OK)
2. 🔄 **Testar pagamento real** com valor maior (R$ 2,00+)
3. 🔍 **Verificar logs do Vercel** durante o teste
4. ⚙️ **Configurar webhook** manualmente se necessário
5. 📱 **Testar com diferentes apps** de banco se necessário
