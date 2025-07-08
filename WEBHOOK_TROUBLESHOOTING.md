# Troubleshooting Webhook Mercado Pago

## Problema Identificado
- Notificação de teste funciona ✅
- Pagamento real não chega ao webhook ❌

## Possíveis Causas

### 1. **Diferentes Ambientes (Sandbox vs Produção)**
- **Teste**: Usa ambiente sandbox
- **Produção**: Usa ambiente real
- **Verificação**: Confirmar se o token no Vercel é de produção

### 2. **Configuração de Webhook no Mercado Pago**
- Verificar se o webhook está configurado para produção
- URL do webhook deve apontar para o Vercel
- Eventos configurados devem incluir `payment.created` e `payment.updated`

### 3. **Problemas de Conectividade**
- Timeout na requisição para buscar detalhes do pagamento
- Token de acesso inválido ou expirado
- Rate limiting da API do Mercado Pago

### 4. **Tipos de Pagamento Diferentes**
- Pagamentos de teste podem ter estrutura diferente
- Pagamentos reais podem ter campos adicionais
- Diferentes métodos de pagamento (PIX, cartão, etc.)

## Debugging Steps

### 1. Verificar Health do Servidor
```bash
GET https://seu-dominio.vercel.app/health
```

### 2. Testar Conectividade MP
```bash
GET https://seu-dominio.vercel.app/test-mp-connection
```

### 3. Simular Webhook
```bash
POST https://seu-dominio.vercel.app/simulate-webhook
{
  "paymentId": "ID_DO_PAGAMENTO_REAL"
}
```

### 4. Verificar Logs no Vercel
- Acessar dashboard do Vercel
- Ir em Functions > Logs
- Verificar se há erros ou timeouts

### 5. Verificar Configuração do Webhook no MP
- Acessar painel do Mercado Pago
- Verificar se URL está correta
- Verificar se eventos estão configurados
- Verificar se webhook está ativo

## Melhorias Implementadas

1. **Logs Detalhados**: Adicionado logging completo de headers, body e processos
2. **Endpoints de Debug**: Criados endpoints para verificar conectividade e simular webhooks
3. **Tratamento de Erros**: Melhorado tratamento de erros com informações detalhadas
4. **Validação de Token**: Verificação se token está configurado corretamente

## Próximos Passos

1. Fazer deploy das mudanças
2. Testar endpoints de debug
3. Verificar logs após pagamento real
4. Ajustar configuração do webhook se necessário
