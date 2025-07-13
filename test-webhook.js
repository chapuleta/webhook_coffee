#!/usr/bin/env node

// Script para testar webhook do Mercado Pago
// Uso: node test-webhook.js [comando] [parâmetros]

const axios = require('axios');

// Configurar a URL base do seu servidor
const BASE_URL = 'https://webhook-coffee.vercel.app'; // Substitua pela sua URL do Vercel

const commands = {
  health: async () => {
    console.log('🔍 Verificando health do servidor...');
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Servidor funcionando:', response.data);
    } catch (error) {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  },

  'test-mp': async () => {
    console.log('🔍 Testando conectividade com Mercado Pago...');
    try {
      const response = await axios.get(`${BASE_URL}/test-mp-connection`);
      console.log('✅ Conectividade OK:', response.data);
    } catch (error) {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  },

  'webhook-config': async () => {
    console.log('🔍 Verificando configuração do webhook...');
    try {
      const response = await axios.get(`${BASE_URL}/webhook-config`);
      console.log('✅ Configuração:', response.data);
    } catch (error) {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  },

  'setup-webhook': async () => {
    console.log('🔧 Configurando webhook...');
    try {
      const response = await axios.post(`${BASE_URL}/setup-webhook`, {
        url: `${BASE_URL}/webhook`
      });
      console.log('✅ Webhook configurado:', response.data);
    } catch (error) {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  },

  'test-payment': async (amount = 1.00) => {
    console.log(`💰 Criando pagamento de teste (R$ ${amount})...`);
    try {
      const response = await axios.post(`${BASE_URL}/test-low-value-payment`, {
        amount: parseFloat(amount),
        description: `Teste Café R$ ${amount}`
      });
      console.log('✅ Pagamento criado:', response.data);
      
      if (response.data.payment?.qr_code) {
        console.log('📱 QR Code PIX:', response.data.payment.qr_code);
      }
    } catch (error) {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  },

  'generate-qr': async () => {
    console.log('📱 Gerando QR Code PIX (valor editável)...');
    try {
      const response = await axios.post(`${BASE_URL}/generate-qr`, {
        description: 'Doação Teste - Cafeteira IoT'
      });
      console.log('✅ QR Code gerado:', response.data);
      
      if (response.data.payment?.qr_code) {
        console.log('📱 QR Code PIX:', response.data.payment.qr_code);
        console.log('🌐 Acesse a página: ' + BASE_URL + '/qr-page');
      }
    } catch (error) {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  },

  'generate-qr-fixed': async (amount = 5.00) => {
    console.log(`💰 Gerando QR Code PIX fixo (R$ ${amount})...`);
    try {
      const response = await axios.post(`${BASE_URL}/generate-qr-fixed`, {
        amount: parseFloat(amount),
        description: `Doação Fixa R$ ${amount} - Cafeteira IoT`
      });
      console.log('✅ QR Code gerado:', response.data);
      
      if (response.data.payment?.qr_code) {
        console.log('📱 QR Code PIX:', response.data.payment.qr_code);
      }
    } catch (error) {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  },

  'open-qr-page': async () => {
    console.log('🌐 Abrindo página com QR Code...');
    console.log(`📱 Acesse: ${BASE_URL}/qr-page`);
    console.log('💡 Esta página permite que o usuário digite o valor da doação!');
  },

  'simulate': async (paymentId) => {
    if (!paymentId) {
      console.error('❌ É necessário fornecer um ID de pagamento');
      return;
    }
    
    console.log(`🔄 Simulando webhook para pagamento ${paymentId}...`);
    try {
      const response = await axios.post(`${BASE_URL}/simulate-webhook`, {
        paymentId: paymentId
      });
      console.log('✅ Webhook simulado:', response.data);
    } catch (error) {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  },

  'coffee-status': async () => {
    console.log('☕ Verificando status da cafeteira...');
    try {
      const response = await axios.get(`${BASE_URL}/coffee-status`);
      console.log('✅ Status:', response.data);
    } catch (error) {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  },

  'reset': async () => {
    console.log('🔄 Resetando dados da cafeteira...');
    try {
      const response = await axios.post(`${BASE_URL}/reset`);
      console.log('✅ Dados resetados:', response.data);
    } catch (error) {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
  },

  'full-test': async () => {
    console.log('🧪 Executando teste completo...\n');
    
    // 1. Health check
    await commands.health();
    console.log('');
    
    // 2. Test MP connection
    await commands['test-mp']();
    console.log('');
    
    // 3. Webhook config
    await commands['webhook-config']();
    console.log('');
    
    // 4. Coffee status
    await commands['coffee-status']();
    console.log('');
    
    // 5. Test payment
    await commands['test-payment'](1.00);
    console.log('');
    
    console.log('✅ Teste completo finalizado!');
  }
};

// Função principal
async function main() {
  const [,, command, ...args] = process.argv;
  
  if (!command || !commands[command]) {
    console.log('🚀 Script de Teste - Webhook Mercado Pago');
    console.log('');
    console.log('Comandos disponíveis:');
    console.log('  health              - Verificar se servidor está funcionando');
    console.log('  test-mp             - Testar conectividade com Mercado Pago');
    console.log('  webhook-config      - Verificar configuração do webhook');
    console.log('  setup-webhook       - Configurar webhook automaticamente');
    console.log('  test-payment [valor] - Criar pagamento de teste (padrão: R$ 1,00)');
    console.log('  generate-qr         - Gerar QR Code PIX (valor editável)');
    console.log('  generate-qr-fixed [valor] - Gerar QR Code PIX com valor fixo');
    console.log('  open-qr-page        - Mostrar URL da página com QR Code');
    console.log('  simulate [id]       - Simular webhook para pagamento específico');
    console.log('  coffee-status       - Verificar status da cafeteira');
    console.log('  reset               - Resetar dados da cafeteira');
    console.log('  full-test           - Executar teste completo');
    console.log('');
    console.log('Exemplos:');
    console.log('  node test-webhook.js health');
    console.log('  node test-webhook.js generate-qr');
    console.log('  node test-webhook.js generate-qr-fixed 10.00');
    console.log('  node test-webhook.js open-qr-page');
    console.log('  node test-webhook.js test-payment 0.01');
    console.log('  node test-webhook.js simulate 123456789');
    console.log('  node test-webhook.js full-test');
    return;
  }
  
  try {
    await commands[command](...args);
  } catch (error) {
    console.error('❌ Erro ao executar comando:', error.message);
  }
}

main();
