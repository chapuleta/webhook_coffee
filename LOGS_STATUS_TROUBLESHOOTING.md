# Troubleshooting: Logs de Status com Valor 0.00

## Problema Identificado

Você estava recebendo logs de consultas ao endpoint `/coffee-status` com valores 0.00 mesmo sem ninguém ter feito pagamentos. 

## Causa Raiz

O problema era causado por **duas fontes de consultas automáticas**:

### 1. Página Web com Auto-Refresh
- A página `/qr-page` possui um JavaScript que consulta `/coffee-status` a cada 5 segundos
- Isso permite que o status seja atualizado em tempo real na tela
- Quando alguém deixa a página aberta, gera logs contínuos

### 2. Possíveis Consultas do ESP32
- O ESP32 também pode estar configurado para consultar o status periodicamente
- Essas consultas são normais e esperadas para manter o display atualizado

## Solução Implementada

### Logs Diferenciados por Origem
Agora o sistema identifica e categoriza as consultas:

```javascript
// Identificar origem da consulta
const userAgent = req.get('User-Agent') || 'unknown';
const origin = req.get('Referer') || 'unknown';

if (userAgent.includes('ESP32') || userAgent.includes('Arduino')) {
  console.log('📱 Status consultado pelo ESP32:', response);
} else if (origin.includes('/qr-page') || userAgent.includes('Mozilla')) {
  console.log('🌐 Status consultado pela página web (auto-refresh):', response);
} else {
  console.log('❓ Status consultado por origem desconhecida:', { userAgent, origin, response });
}
```

### Tipos de Logs Agora Exibidos:

1. **📱 ESP32**: Consultas vindas do dispositivo ESP32
2. **🌐 Página Web**: Consultas automáticas da página QR (auto-refresh)
3. **❓ Origem Desconhecida**: Outras consultas

## Como Testar

```bash
# Consulta normal (será categorizada como origem desconhecida)
node test-webhook.js coffee-status

# Simular consulta do ESP32
node test-webhook-fixed.js esp32-status

# Abrir página web (irá gerar logs categorizados como página web)
# https://webhook-coffee.vercel.app/qr-page
```

## Interface do QR Code Melhorada

Também foi melhorada a interface da página QR para deixar **muito mais claro** que o valor é editável:

### Instruções Destacadas:
- ✅ "🔥 EDITE O VALOR para qualquer quantia que desejar"
- ✅ "🎯 IMPORTANTE: O VALOR É TOTALMENTE EDITÁVEL!"
- ✅ Exemplos claros de valores possíveis
- ✅ Instruções sobre como editar no app do banco

## Monitoramento dos Logs

Agora você pode distinguir facilmente:

- **Logs normais**: Consultas do ESP32 e auto-refresh da página web
- **Logs importantes**: Webhooks de pagamentos reais
- **Logs suspeitos**: Consultas de origem desconhecida

## Recomendações

1. **Logs do ESP32** são normais e esperados
2. **Logs da página web** são normais quando alguém está visualizando o QR
3. **Monitore apenas** os webhooks de pagamento para pagamentos reais
4. **Use o reset** se quiser limpar os dados: `node test-webhook.js reset`

## Valor Mínimo no QR Code

O valor permanece 0.01 (obrigatório pela API do Mercado Pago), mas agora com instruções claras de que o usuário pode e deve editar o valor no app do banco antes de confirmar o pagamento.
