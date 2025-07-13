import requests
import json
import uuid 

# Configuração
MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-5426692687926122-070811-eab51cec3eee674658dab7096fb3ba16-113476843"
WEBHOOK_URL = "https://webhook-coffee.vercel.app/webhook"

def testar_webhook_direto():
    """
    Testa o webhook diretamente enviando um payload similar ao que o MP envia
    """
    print("=== TESTANDO WEBHOOK DIRETO ===")
    
    # Payload similar ao que você recebeu do MP
    webhook_payload = {
        "action": "payment.updated",
        "api_version": "v1",
        "data": {
            "id": "118423154670"  # ID de um pagamento real que você teve
        },
        "date_created": "2025-07-13T05:35:52Z",
        "id": 122862896291,
        "live_mode": True,
        "type": "payment",
        "user_id": "113476843"
    }
    
    try:
        response = requests.post(
            WEBHOOK_URL,
            headers={'Content-Type': 'application/json'},
            json=webhook_payload,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200 and response.text == "OK":
            print("✅ Webhook respondeu corretamente!")
            return True
        else:
            print("❌ Webhook não respondeu como esperado")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao testar webhook: {e}")
        return False

def criar_pagamento_teste():
    """
    Cria um pagamento real para testar o webhook
    """
    print("=== CRIANDO PAGAMENTO TESTE ===")
    
    idempotency_key = str(uuid.uuid4())
    headers = {
        'Authorization': f'Bearer {MERCADO_PAGO_ACCESS_TOKEN}',
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotency_key
    }

    dados_cobranca = {
        "transaction_amount": 0.01,
        "description": "Teste Webhook Cafeteira IoT",
        "payment_method_id": "pix",
        "notification_url": WEBHOOK_URL,
        "payer": {
            "email": "teste@webhook.com",
            "first_name": "Teste",
            "last_name": "Webhook"
        }
    }

    try:
        response = requests.post(
            "https://api.mercadopago.com/v1/payments",
            headers=headers,
            json=dados_cobranca
        )
        response.raise_for_status()
        
        pagamento = response.json()
        payment_id = pagamento.get('id')
        qr_code = pagamento.get('point_of_interaction', {}).get('transaction_data', {}).get('qr_code')
        
        print(f"✅ Pagamento criado: {payment_id}")
        print(f"Status: {pagamento.get('status')}")
        print(f"QR Code PIX:\n{qr_code}")
        
        return payment_id
        
    except Exception as e:
        print(f"❌ Erro ao criar pagamento: {e}")
        return None

def verificar_status_cafeteira():
    """
    Verifica o status atual da cafeteira
    """
    print("=== STATUS DA CAFETEIRA ===")
    
    try:
        response = requests.get("https://webhook-coffee.vercel.app/coffee-status")
        if response.status_code == 200:
            status = response.json()
            print(f"Total arrecadado: R$ {status.get('total', '0.00')}")
            print(f"Última doação: R$ {status.get('lastDonation', {}).get('amount', '0.00')}")
            print(f"Doador: {status.get('lastDonation', {}).get('donorName', 'N/A')}")
            print(f"Número de doações: {status.get('transactionCount', 0)}")
        else:
            print(f"❌ Erro ao consultar status: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    print("🧪 TESTE COMPLETO DO WEBHOOK")
    print("-" * 50)
    
    # 1. Testar webhook direto
    webhook_ok = testar_webhook_direto()
    
    # 2. Verificar status inicial
    print("\n" + "="*50)
    verificar_status_cafeteira()
    
    # 3. Criar pagamento teste
    print("\n" + "="*50)
    payment_id = criar_pagamento_teste()
    
    if payment_id:
        print(f"\n💡 Para testar completamente:")
        print(f"1. Pague o PIX de R$ 0,01 criado acima")
        print(f"2. Aguarde alguns segundos")
        print(f"3. Verifique se o webhook foi chamado sem erro 502")
        print(f"4. Execute novamente para ver se o status mudou")
