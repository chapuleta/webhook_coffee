import requests
import time

def warmup_server():
    """
    Aquece o servidor para evitar cold start nos webhooks
    """
    print("🔥 Aquecendo servidor...")
    
    endpoints = [
        "https://webhook-coffee.vercel.app/",
        "https://webhook-coffee.vercel.app/warmup",
        "https://webhook-coffee.vercel.app/coffee-status"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(endpoint, timeout=10)
            print(f"✅ {endpoint} - {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - Erro: {e}")
        time.sleep(0.5)
    
    print("🔥 Servidor aquecido!")

def test_webhook_performance():
    """
    Testa múltiplas requisições ao webhook para verificar consistência
    """
    print("\n🧪 Testando performance do webhook...")
    
    webhook_url = "https://webhook-coffee.vercel.app/webhook"
    test_payload = {
        "action": "payment.created",
        "data": {"id": "test123"},
        "type": "payment"
    }
    
    success_count = 0
    total_tests = 5
    
    for i in range(total_tests):
        try:
            start_time = time.time()
            response = requests.post(
                webhook_url,
                json=test_payload,
                timeout=5
            )
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # em ms
            
            if response.status_code == 200 and response.text == "OK":
                success_count += 1
                print(f"✅ Teste {i+1}: {response.status_code} - {response_time:.0f}ms")
            else:
                print(f"❌ Teste {i+1}: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Teste {i+1}: Erro - {e}")
        
        time.sleep(1)  # Intervalo entre testes
    
    print(f"\n📊 Resultado: {success_count}/{total_tests} sucessos")
    
    if success_count == total_tests:
        print("🎉 Webhook está 100% estável!")
    elif success_count > total_tests * 0.8:
        print("⚠️ Webhook está majoritariamente estável")
    else:
        print("❌ Webhook ainda tem problemas")

if __name__ == "__main__":
    print("🚀 TESTE DE ESTABILIDADE DO WEBHOOK")
    print("=" * 50)
    
    # 1. Aquecer servidor
    warmup_server()
    
    # 2. Testar performance
    test_webhook_performance()
    
    print("\n💡 Se todos os testes passaram, o webhook deve funcionar sem erro 502!")
