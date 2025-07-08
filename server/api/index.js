require('dotenv').config();
const express = require('express');
const axios = require('axios');
const serverless = require('serverless-http');

// Verificar se o token do Mercado Pago está carregado
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
console.log('MP_ACCESS_TOKEN definido?', MP_ACCESS_TOKEN ? 'Sim' : 'Não');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Vercel Environment:', process.env.VERCEL_ENV);

const app = express();

// Middleware para parsing JSON
app.use(express.json());

// Middleware para CORS (necessário para requests do ESP32)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Log de todas requisições para debug de métodos/paths
app.use((req, res, next) => {
  console.log("[Request]", req.method, req.originalUrl);
  next();
});

// Dados em memória (em produção, use um banco de dados)
let coffeeData = {
  totalAmount: 0,
  lastDonation: {
    amount: 0,
    date: null,
    donorName: 'Anônimo'
  },
  transactionCount: 0
};

// Endpoint de teste
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor Ponte Cafeteira IoT funcionando!',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Handler GET para handshake do Mercado Pago (GET com x-hook-secret)
app.get('/webhook', (req, res) => {
  const hookSecret = req.header('x-hook-secret');
  if (hookSecret) {
    console.log('Handshake GET Mercado Pago, retornando x-hook-secret');
    res.set('x-hook-secret', hookSecret);
  }
  return res.status(200).end();
});

// Handler POST para receber webhooks do Mercado Pago
app.post('/webhook', async (req, res) => {
   // Log detalhado da requisição
   console.log('=== WEBHOOK RECEBIDO ===');
   console.log('Headers:', req.headers);
   console.log('Body:', JSON.stringify(req.body, null, 2));
   console.log('Query params:', req.query);
   console.log('========================');

   // Mercado Pago handshake: responder o header x-hook-secret
   const hookSecret = req.header('x-hook-secret');
   if (hookSecret) {
     console.log('Handshake Mercado Pago, retornando x-hook-secret');
     res.set('x-hook-secret', hookSecret);
     return res.status(200).end();
   }

   try {
     console.log('Processando webhook...');
     
     const { action, data } = req.body;
     
     // Log da ação recebida
     console.log('Ação:', action);
     console.log('Data ID:', data?.id);
     
     // Verificar se é uma notificação de pagamento
     if (action === 'payment.created' || action === 'payment.updated') {
       const paymentId = data.id;
       console.log(`Processando pagamento ID: ${paymentId}`);
       
       // Buscar detalhes do pagamento na API do Mercado Pago
       const paymentDetails = await getPaymentDetails(paymentId);
       
       if (paymentDetails) {
         console.log('Detalhes do pagamento:', {
           id: paymentDetails.id,
           status: paymentDetails.status,
           amount: paymentDetails.transaction_amount,
           payer: paymentDetails.payer?.first_name,
           payment_method: paymentDetails.payment_method_id,
           date_created: paymentDetails.date_created
         });
         
         if (paymentDetails.status === 'approved') {
           // Atualizar dados da cafeteira
           updateCoffeeData(paymentDetails);
           
           console.log('✅ Pagamento aprovado e dados atualizados!');
         } else {
           console.log(`⚠️ Pagamento não aprovado. Status: ${paymentDetails.status}`);
         }
       } else {
         console.log('❌ Não foi possível obter detalhes do pagamento');
       }
     } else {
       console.log(`ℹ️ Ação não processada: ${action}`);
     }
     
     res.status(200).json({ message: 'Webhook processado com sucesso' });
   } catch (error) {
     console.error('❌ Erro ao processar webhook:', error);
     res.status(500).json({ error: 'Erro interno do servidor' });
   }
});

// Endpoint para o ESP32 consultar dados da cafeteira
app.get('/coffee-status', (req, res) => {
  try {
    const response = {
      total: coffeeData.totalAmount.toFixed(2),
      lastDonation: {
        amount: coffeeData.lastDonation.amount.toFixed(2),
        date: coffeeData.lastDonation.date,
        donor: coffeeData.lastDonation.donorName
      },
      count: coffeeData.transactionCount,
      lastUpdate: new Date().toISOString()
    };
    
    console.log('Status consultado pelo ESP32:', response);
    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para reset dos dados (útil para testes)
app.post('/reset', (req, res) => {
  coffeeData = {
    totalAmount: 0,
    lastDonation: {
      amount: 0,
      date: null,
      donorName: 'Anônimo'
    },
    transactionCount: 0
  };
  
  console.log('Dados resetados');
  res.json({ message: 'Dados resetados com sucesso', data: coffeeData });
});

// Endpoint para debug - verificar se o servidor está funcionando
app.get('/health', (req, res) => {
  res.json({
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercelEnv: process.env.VERCEL_ENV,
    hasToken: !!MP_ACCESS_TOKEN,
    tokenPreview: MP_ACCESS_TOKEN ? `${MP_ACCESS_TOKEN.substring(0, 10)}...` : 'Não configurado'
  });
});

// Endpoint para testar conectividade com Mercado Pago
app.get('/test-mp-connection', async (req, res) => {
  try {
    const response = await axios.get('https://api.mercadopago.com/v1/account/settings', {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      }
    });
    
    res.json({
      success: true,
      message: 'Conectividade com Mercado Pago OK',
      accountId: response.data.account_id,
      country: response.data.country_id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro na conectividade com Mercado Pago',
      error: error.response?.data || error.message
    });
  }
});

// Endpoint para simular webhook (útil para testes)
app.post('/simulate-webhook', async (req, res) => {
  const { paymentId } = req.body;
  
  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId é obrigatório' });
  }
  
  try {
    console.log(`Simulando webhook para pagamento ${paymentId}`);
    
    const paymentDetails = await getPaymentDetails(paymentId);
    
    if (paymentDetails) {
      if (paymentDetails.status === 'approved') {
        updateCoffeeData(paymentDetails);
        res.json({ 
          success: true, 
          message: 'Webhook simulado com sucesso',
          paymentDetails: {
            id: paymentDetails.id,
            status: paymentDetails.status,
            amount: paymentDetails.transaction_amount
          }
        });
      } else {
        res.json({ 
          success: false, 
          message: `Pagamento não aprovado. Status: ${paymentDetails.status}`,
          paymentDetails: {
            id: paymentDetails.id,
            status: paymentDetails.status,
            amount: paymentDetails.transaction_amount
          }
        });
      }
    } else {
      res.status(404).json({ error: 'Pagamento não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao simular webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para buscar detalhes do pagamento na API do Mercado Pago
async function getPaymentDetails(paymentId) {
  try {
    console.log(`Buscando detalhes do pagamento ${paymentId}...`);
    
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      }
    );
    
    console.log('✅ Detalhes do pagamento obtidos com sucesso');
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar detalhes do pagamento:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    return null;
  }
}

// Função para atualizar dados da cafeteira
function updateCoffeeData(paymentDetails) {
  const amount = parseFloat(paymentDetails.transaction_amount);
  const donorName = paymentDetails.payer?.first_name || 'Anônimo';
  
  // Atualizar saldo total
  coffeeData.totalAmount += amount;
  
  // Atualizar última doação
  coffeeData.lastDonation = {
    amount: amount,
    date: new Date().toISOString(),
    donorName: donorName
  };
  
  // Incrementar contador
  coffeeData.transactionCount++;
  
  console.log('Dados atualizados:', coffeeData);
}

// Middleware para capturar rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint não encontrado',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /test-mp-connection',
      'GET /webhook',
      'POST /webhook',
      'GET /coffee-status',
      'POST /reset',
      'POST /simulate-webhook'
    ]
  });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Exportar como função serverless para Vercel
module.exports = serverless(app);
