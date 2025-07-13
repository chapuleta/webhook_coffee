import requests
import time

def test_all_webhook_variants():
    """
    Testa todas as variações de webhook para encontrar a que funciona
    """
    print("🧪 TESTANDO TODAS AS VARIAÇÕES DE WEBHOOK")
    print("=" * 60)
    
    base_url = "https://webhook-coffee.vercel.app"
    test_payload = {
        "action": "payment.created",
        "data": {"id": "test123"},
        "type": "payment"
    }
    
    webhooks = [
        "/webhook",           # Original otimizado
        "/webhook-debug",     # Com logging
        "/webhook-minimal"    # Ultra minimalista
    ]
    
    results = {}
    
    for webhook_path in webhooks:
        print(f"\n🔍 Testando: {webhook_path}")
        print("-" * 40)
        
        success_count = 0
        total_tests = 3
        response_times = []
        
        for i in range(total_tests):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{base_url}{webhook_path}",
                    json=test_payload,
                    timeout=5
                )
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000
                response_times.append(response_time)
                
                if response.status_code == 200:
                    success_count += 1
                    print(f"  ✅ Teste {i+1}: {response.status_code} - {response_time:.0f}ms - '{response.text[:20]}...'")
                else:
                    print(f"  ❌ Teste {i+1}: {response.status_code} - {response.text}")
                    
            except Exception as e:
                print(f"  💥 Teste {i+1}: Erro - {e}")
            
            time.sleep(0.5)
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        success_rate = (success_count / total_tests) * 100
        
        results[webhook_path] = {
            'success_rate': success_rate,
            'avg_response_time': avg_response_time,
            'success_count': success_count,
            'total_tests': total_tests
        }
        
        print(f"  📊 Taxa de sucesso: {success_rate:.1f}%")
        print(f"  ⏱️ Tempo médio: {avg_response_time:.0f}ms")
    
    # Resumo final
    print("\n" + "=" * 60)
    print("📊 RESUMO FINAL")
    print("=" * 60)
    
    best_webhook = None
    best_success_rate = 0
    
    for webhook_path, stats in results.items():
        print(f"\n🎯 {webhook_path}:")
        print(f"   Taxa de sucesso: {stats['success_rate']:.1f}%")
        print(f"   Tempo médio: {stats['avg_response_time']:.0f}ms")
        print(f"   Sucessos: {stats['success_count']}/{stats['total_tests']}")
        
        if stats['success_rate'] > best_success_rate:
            best_success_rate = stats['success_rate']
            best_webhook = webhook_path
    
    print(f"\n🏆 MELHOR WEBHOOK: {best_webhook}")
    print(f"   Taxa de sucesso: {best_success_rate:.1f}%")
    
    if best_success_rate == 100:
        print("🎉 Webhook perfeito encontrado!")
        print(f"💡 Configure o Mercado Pago para usar: {base_url}{best_webhook}")
    else:
        print("⚠️ Ainda há problemas com todos os webhooks")
        print("💡 Pode ser um problema de infraestrutura do Vercel")

def test_minimal_endpoints():
    """
    Testa endpoints mínimos para verificar infraestrutura
    """
    print("\n🔧 TESTANDO INFRAESTRUTURA BÁSICA")
    print("=" * 50)
    
    base_url = "https://webhook-coffee.vercel.app"
    endpoints = [
        "/",
        "/warmup",
        "/coffee-status"
    ]
    
    for endpoint in endpoints:
        try:
            start_time = time.time()
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000
            print(f"✅ {endpoint} - {response.status_code} - {response_time:.0f}ms")
            
        except Exception as e:
            print(f"❌ {endpoint} - Erro: {e}")

if __name__ == "__main__":
    # Testar infraestrutura básica primeiro
    test_minimal_endpoints()
    
    # Depois testar todas as variações de webhook
    test_all_webhook_variants()
