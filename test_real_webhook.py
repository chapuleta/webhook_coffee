import requests
import json
import uuid

def create_payment_and_force_webhook():
    """
    Cria um pagamento real e força o webhook para testar
    """
    print("🔬 TESTE DE WEBHOOK REAL")
    print("=" * 40)
    
    # Token do Mercado Pago
    token = "APP_USR-5426692687926122-070811-eab51cec3eee674658dab7096fb3ba16-113476843"
    
    # Criar pagamento
    payment_data = {
        "transaction_amount": 0.01,
        "description": "Teste Webhook Final",
        "payment_method_id": "pix",
        "notification_url": "https://webhook-coffee.vercel.app/webhook",
        "payer": {
            "email": "teste.final@webhook.com",
            "first_name": "Teste",
            "last_name": "Final"
        }
    }
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'X-Idempotency-Key': str(uuid.uuid4())
    }
    
    try:
        response = requests.post(
            "https://api.mercadopago.com/v1/payments",
            headers=headers,
            json=payment_data
        )
        
        if response.status_code == 201:
            payment = response.json()
            payment_id = payment['id']
            qr_code = payment.get('point_of_interaction', {}).get('transaction_data', {}).get('qr_code')
            
            print(f"✅ Pagamento criado: {payment_id}")
            print(f"Status: {payment['status']}")
            print(f"QR Code: {qr_code[:50]}...")
            
            print(f"\n🎯 AGORA:")
            print(f"1. Pague este PIX de R$ 0,01")
            print(f"2. Observe no painel do MP se o webhook chega com erro 502")
            print(f"3. Se chegar sem erro, o problema foi resolvido!")
            
            return payment_id
        else:
            print(f"❌ Erro ao criar pagamento: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"💥 Erro: {e}")
        return None

if __name__ == "__main__":
    create_payment_and_force_webhook()
