require('dotenv').config();
const express = require('express');
const axios = require('axios');

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

// Variáveis de configuração
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

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

// Endpoint para receber webhooks do Mercado Pago
app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook recebido:', req.body);
    
    const { action, data } = req.body;
    
    // Verificar se é uma notificação de pagamento
    if (action === 'payment.created' || action === 'payment.updated') {
      const paymentId = data.id;
      
      // Buscar detalhes do pagamento na API do Mercado Pago
      const paymentDetails = await getPaymentDetails(paymentId);
      
      if (paymentDetails && paymentDetails.status === 'approved') {
        // Atualizar dados da cafeteira
        updateCoffeeData(paymentDetails);
        
        console.log('Pagamento aprovado:', {
          id: paymentId,
          amount: paymentDetails.transaction_amount,
          payer: paymentDetails.payer.first_name
        });
      }
    }
    
    res.status(200).json({ message: 'Webhook processado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
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

// Função para buscar detalhes do pagamento na API do Mercado Pago
async function getPaymentDetails(paymentId) {
  try {
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar detalhes do pagamento:', error.response?.data || error.message);
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
      'POST /webhook',
      'GET /coffee-status',
      'POST /reset'
    ]
  });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Exportar o app para a Vercel (não usar app.listen)
module.exports = app;
