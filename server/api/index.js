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

// Endpoint para gerar QR Code PIX (valor será digitado pelo usuário)
app.post('/generate-qr', async (req, res) => {
  try {
    const { description = 'Doação para Cafeteira IoT', externalReference = null } = req.body;
    
    // Criar um pagamento PIX sem valor fixo (valor será inserido pelo usuário)
    const paymentData = {
      description: description,
      external_reference: externalReference || `coffee-${Date.now()}`,
      notification_url: `${req.protocol}://${req.get('host')}/webhook`,
      payment_method_id: 'pix',
      transaction_amount: 0.01, // Valor mínimo, será sobrescrito pelo usuário
      payer: {
        email: 'cafe@exemplo.com'
      }
    };

    const response = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      paymentData,
      {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const payment = response.data;
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url,
        status: payment.status,
        description: payment.description
      },
      message: 'QR Code gerado com sucesso! O usuário pode editar o valor ao pagar.'
    });

  } catch (error) {
    console.error('Erro ao gerar QR Code:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar QR Code',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para gerar QR Code com valor específico
app.post('/generate-qr-fixed', async (req, res) => {
  try {
    const { 
      amount = 5.00, 
      description = 'Doação para Cafeteira IoT',
      payerEmail = 'cafe@exemplo.com',
      externalReference = null 
    } = req.body;

    if (amount < 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Valor mínimo é R$ 0,01'
      });
    }

    const paymentData = {
      transaction_amount: parseFloat(amount),
      description: description,
      external_reference: externalReference || `coffee-fixed-${Date.now()}`,
      notification_url: `${req.protocol}://${req.get('host')}/webhook`,
      payment_method_id: 'pix',
      payer: {
        email: payerEmail
      }
    };

    const response = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      paymentData,
      {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const payment = response.data;
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.transaction_amount,
        qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url,
        status: payment.status,
        description: payment.description,
        expires_at: payment.date_of_expiration
      },
      message: `QR Code gerado para pagamento de R$ ${amount}`
    });

  } catch (error) {
    console.error('Erro ao gerar QR Code fixo:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar QR Code',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para criar uma página web com QR Code
app.get('/qr-page', async (req, res) => {
  try {
    // Gerar um QR Code para valor editável
    const paymentData = {
      description: 'Doação para Cafeteira IoT ☕',
      external_reference: `coffee-web-${Date.now()}`,
      notification_url: `${req.protocol}://${req.get('host')}/webhook`,
      payment_method_id: 'pix',
      transaction_amount: 0.01, // Valor mínimo
      payer: {
        email: 'cafe@exemplo.com'
      }
    };

    const response = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      paymentData,
      {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const payment = response.data;
    const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64;
    
    // Página HTML com QR Code
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>☕ Doação para Cafeteira IoT</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 500px;
                margin: 0 auto;
                padding: 20px;
                text-align: center;
                background: linear-gradient(135deg, #6F4E37, #8B4513);
                color: white;
                min-height: 100vh;
            }
            .container {
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }
            h1 { color: #FFD700; }
            .qr-code {
                background: white;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                display: inline-block;
            }
            .qr-code img {
                max-width: 300px;
                width: 100%;
            }
            .instructions {
                background: rgba(255,255,255,0.2);
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .status {
                margin-top: 20px;
                padding: 15px;
                background: rgba(0,255,0,0.2);
                border-radius: 10px;
            }
            .coffee-icon { font-size: 3em; margin: 10px 0; }
        </style>
        <script>
            // Verificar status do pagamento a cada 5 segundos
            let checkInterval;
            
            function startChecking() {
                checkInterval = setInterval(checkPaymentStatus, 5000);
            }
            
            function checkPaymentStatus() {
                fetch('/coffee-status')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('total').textContent = 'R$ ' + data.total;
                        document.getElementById('count').textContent = data.count;
                        if (data.lastDonation.amount > 0) {
                            document.getElementById('lastAmount').textContent = 'R$ ' + data.lastDonation.amount;
                            document.getElementById('lastDonor').textContent = data.lastDonation.donor;
                        }
                    })
                    .catch(error => console.error('Erro:', error));
            }
            
            window.onload = function() {
                checkPaymentStatus();
                startChecking();
            };
        </script>
    </head>
    <body>
        <div class="container">
            <div class="coffee-icon">☕</div>
            <h1>Doação para Cafeteira IoT</h1>
            
            <div class="instructions">
                <h3>📱 Como doar:</h3>
                <p>1. Escaneie o QR Code com seu app do banco</p>
                <p>2. <strong>Digite o valor que desejar</strong></p>
                <p>3. Confirme o pagamento PIX</p>
                <p>4. Sua doação aparecerá no display em tempo real!</p>
            </div>
            
            <div class="qr-code">
                ${qrCodeBase64 ? `<img src="data:image/png;base64,${qrCodeBase64}" alt="QR Code PIX">` : '<p>Erro ao gerar QR Code</p>'}
            </div>
            
            <div class="status">
                <h3>📊 Status da Cafeteira</h3>
                <p><strong>Total arrecadado:</strong> <span id="total">R$ 0,00</span></p>
                <p><strong>Número de doações:</strong> <span id="count">0</span></p>
                <p><strong>Última doação:</strong> <span id="lastAmount">-</span> por <span id="lastDonor">-</span></p>
            </div>
            
            <div class="instructions">
                <small>💡 O valor é editável! Você pode doar qualquer quantia a partir de R$ 0,01</small>
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(html);

  } catch (error) {
    console.error('Erro ao gerar página QR:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Erro ao gerar página QR',
      details: error.response?.data || error.message
    });
  }
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
      'POST /reset',
      'POST /generate-qr',
      'POST /generate-qr-fixed',
      'GET /qr-page'
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
