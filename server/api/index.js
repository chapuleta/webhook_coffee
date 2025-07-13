require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();

// Middleware para parsing JSON com limite maior para webhooks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para logs de requisições
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Middleware para CORS (necessário para requests do ESP32)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Responder OPTIONS requests rapidamente
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware para adicionar headers de segurança
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
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
  const healthcheck = {
    status: 'OK',
    message: 'Servidor Ponte Cafeteira IoT funcionando!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      memory_usage: process.memoryUsage()
    },
    mercado_pago: {
      token_configured: !!MP_ACCESS_TOKEN,
      token_length: MP_ACCESS_TOKEN ? MP_ACCESS_TOKEN.length : 0
    },
    coffee_data: {
      total_amount: coffeeData.totalAmount,
      transaction_count: coffeeData.transactionCount,
      last_donation_date: coffeeData.lastDonation.date
    },
    endpoints: [
      'GET / (healthcheck)',
      'POST /webhook (receber notificações MP)',
      'GET /coffee-status (status da cafeteira)',
      'POST /reset (resetar dados)',
      'POST /generate-qr (QR Code editável)',
      'POST /generate-qr-fixed (QR Code valor fixo)',
      'GET /qr-page (página web com QR)',
      'GET /test-mp-connection (testar conectividade)',
      'POST /simulate-webhook (simular webhook)'
    ]
  };
  
  res.json(healthcheck);
});

// Endpoint para receber webhooks do Mercado Pago
app.post('/webhook', (req, res) => {
  // RESPOSTA IMEDIATA - não usar async/await aqui
  res.status(200).send('OK');
  
  // Log do webhook recebido
  console.log('🔔 WEBHOOK RECEBIDO:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'x-signature': req.headers['x-signature']
    },
    body: req.body
  });
  
  // Processar webhook de forma completamente assíncrona
  process.nextTick(async () => {
    try {
      // Suporte para diferentes formatos de webhook do Mercado Pago
      let paymentId = null;
      let action = null;
      
      // Formato novo (v1): { action, api_version, data: { id }, date_created, id, live_mode, type, user_id }
      if (req.body.action && req.body.data && req.body.data.id) {
        action = req.body.action;
        paymentId = req.body.data.id;
        console.log('📋 Formato novo de webhook detectado (API v1)');
      }
      // Formato antigo: { action, data }
      else if (req.body.action && req.body.data) {
        action = req.body.action;
        paymentId = req.body.data;
        console.log('📋 Formato antigo de webhook detectado');
      }
      // Formato direto: { id, type }
      else if (req.body.id && req.body.type === 'payment') {
        action = 'payment.updated';
        paymentId = req.body.id;
        console.log('📋 Formato direto de webhook detectado');
      }
      
      // Verificar se é uma notificação de pagamento válida
      if ((action === 'payment.created' || action === 'payment.updated') && paymentId) {
        console.log(`💰 Processando ${action} para pagamento ID: ${paymentId}`);
        
        try {
          // Buscar detalhes do pagamento na API do Mercado Pago
          const paymentDetails = await getPaymentDetails(paymentId);
          
          if (paymentDetails) {
            console.log('📊 Detalhes do pagamento:', {
              id: paymentId,
              status: paymentDetails.status,
              amount: paymentDetails.transaction_amount,
              payment_method: paymentDetails.payment_method_id,
              payer_email: paymentDetails.payer?.email,
              payer_name: paymentDetails.payer?.first_name,
              live_mode: req.body.live_mode
            });
            
            if (paymentDetails.status === 'approved') {
              // Atualizar dados da cafeteira
              updateCoffeeData(paymentDetails);
              
              console.log('✅ PAGAMENTO APROVADO E PROCESSADO:', {
                id: paymentId,
                amount: paymentDetails.transaction_amount,
                payer: paymentDetails.payer?.first_name || 'Anônimo',
                new_total: coffeeData.totalAmount
              });
            } else {
              console.log(`⏳ Pagamento ainda não aprovado. Status: ${paymentDetails.status}`);
            }
          } else {
            console.log('❌ Não foi possível buscar detalhes do pagamento');
          }
        } catch (paymentError) {
          console.error('💥 ERRO AO BUSCAR DETALHES DO PAGAMENTO:', paymentError.message);
        }
      } else {
        console.log(`ℹ️ Webhook ignorado. Action: ${action}, PaymentId: ${paymentId}`);
        console.log('📄 Body completo:', JSON.stringify(req.body, null, 2));
      }
      
    } catch (error) {
      console.error('💥 ERRO NO PROCESSAMENTO DO WEBHOOK:', error.message);
    }
  });
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
    
    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para resetar dados da cafeteira
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
    
    // Criar um pagamento PIX com valor mínimo (usuário pode editar no app do banco)
    const paymentData = {
      description: description,
      external_reference: externalReference || `coffee-${Date.now()}`,
      notification_url: `${req.protocol}://${req.get('host')}/webhook`,
      payment_method_id: 'pix',
      transaction_amount: 0.01, // Valor mínimo obrigatório - usuário pode editar no app do banco
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
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `coffee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `coffee-fixed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `coffee-web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
                <p>2. <strong>🔥 EDITE O VALOR para qualquer quantia que desejar</strong></p>
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
                <h4>🎯 IMPORTANTE: O VALOR É TOTALMENTE EDITÁVEL!</h4>
                <p>✅ Pode doar R$ 1,00, R$ 5,00, R$ 10,00 ou qualquer valor</p>
                <p>✅ Basta alterar no app do seu banco antes de confirmar</p>
                <p>✅ Mínimo: R$ 0,01 • Máximo: sem limite</p>
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

// Endpoint para testar conectividade com Mercado Pago
app.get('/test-mp-connection', async (req, res) => {
  try {
    const response = await axios.get('https://api.mercadopago.com/v1/payment_methods', {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      }
    });
    
    res.json({
      success: true,
      message: 'Conectividade com Mercado Pago OK',
      methods_count: response.data.length
    });
  } catch (error) {
    console.error('Erro ao testar conectividade MP:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao conectar com Mercado Pago',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para verificar configuração do webhook
app.get('/webhook-config', async (req, res) => {
  try {
    // Tentar buscar as configurações atuais de webhook
    const response = await axios.get('https://api.mercadopago.com/v1/account/settings', {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      }
    });
    
    res.json({
      success: true,
      webhook_url: `${req.protocol}://${req.get('host')}/webhook`,
      current_settings: response.data
    });
  } catch (error) {
    console.error('Erro ao verificar config webhook:', error.response?.data || error.message);
    res.json({
      success: false,
      webhook_url: `${req.protocol}://${req.get('host')}/webhook`,
      error: 'Não foi possível verificar configurações',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para configurar webhook automaticamente
app.post('/setup-webhook', async (req, res) => {
  try {
    const webhookUrl = req.body.url || `${req.protocol}://${req.get('host')}/webhook`;
    
    // Tentar configurar o webhook na conta do Mercado Pago
    const response = await axios.post('https://api.mercadopago.com/v1/webhooks', {
      url: webhookUrl,
      events: ['payment']
    }, {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: true,
      message: 'Webhook configurado com sucesso',
      webhook_id: response.data.id,
      webhook_url: webhookUrl
    });
  } catch (error) {
    console.error('Erro ao configurar webhook:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao configurar webhook',
      details: error.response?.data || error.message,
      webhook_url: req.body.url || `${req.protocol}://${req.get('host')}/webhook`
    });
  }
});

// Endpoint para simular webhook (para testes)
app.post('/simulate-webhook', async (req, res) => {
  try {
    const { paymentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId é obrigatório' });
    }
    
    // Buscar detalhes do pagamento
    const paymentDetails = await getPaymentDetails(paymentId);
    
    if (!paymentDetails) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    // Simular webhook
    const webhookBody = {
      action: 'payment.updated',
      data: { id: paymentId }
    };
    
    console.log('🔄 Simulando webhook:', webhookBody);
    
    // Processar como se fosse um webhook real
    if (paymentDetails.status === 'approved') {
      updateCoffeeData(paymentDetails);
      console.log('✅ Webhook simulado processado com sucesso');
    }
    
    res.json({
      success: true,
      message: 'Webhook simulado com sucesso',
      payment: paymentDetails,
      webhook_data: webhookBody
    });
    
  } catch (error) {
    console.error('Erro ao simular webhook:', error);
    res.status(500).json({ error: 'Erro ao simular webhook' });
  }
});

// Função para buscar detalhes do pagamento na API do Mercado Pago
async function getPaymentDetails(paymentId) {
  try {
    console.log(`🔍 Buscando detalhes do pagamento ${paymentId}...`);
    
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 segundos de timeout
      }
    );
    
    console.log(`✅ Detalhes do pagamento ${paymentId} obtidos com sucesso`);
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error(`⏰ Timeout ao buscar pagamento ${paymentId}`);
    } else if (error.response) {
      console.error(`❌ Erro HTTP ao buscar pagamento ${paymentId}:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else {
      console.error(`💥 Erro de rede ao buscar pagamento ${paymentId}:`, error.message);
    }
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
