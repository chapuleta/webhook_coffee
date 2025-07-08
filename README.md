# Projeto Cafeteira IoT ☕

Um sistema IoT que exibe o saldo de uma vaquinha de café em tempo real através de um display LCD conectado a um ESP32, integrado com a API do Mercado Pago para processar doações automáticas.

## 🚀 Funcionalidades

- ✅ Exibição do saldo atual da vaquinha em display LCD
- ✅ Mostra informações da última doação recebida
- ✅ Atualização automática em tempo real via webhook
- ✅ Interface de pagamento via QR Code do Mercado Pago
- ✅ Histórico de transações armazenado no servidor
- ✅ Reconexão automática do ESP32 em caso de falha de rede
- ✅ Logs detalhados para monitoramento do sistema

## 🏗️ Arquitetura

O fluxo de dados do sistema funciona da seguinte forma:

1. **Pagamento via QR Code** - Usuário escaneia o código QR e faz a doação através do Mercado Pago
2. **Webhook do Mercado Pago** - O Mercado Pago envia uma notificação automática para o Servidor Ponte
3. **Processamento no Servidor** - O Servidor Ponte (Node.js) processa e armazena os dados da transação
4. **Requisição do ESP32** - O ESP32 faz requisições HTTP periódicas para o Servidor Ponte
5. **Exibição no Display** - As informações são formatadas e exibidas em um display LCD 16x2

## 🛠️ Hardware Necessário

- **ESP32** - Microcontrolador principal
- **Display LCD I2C 16x2** - Para exibição das informações
- **Módulo WiFi** - Integrado no ESP32
- **Protoboard e jumpers** - Para conexões
- **Fonte de alimentação 5V** - Para alimentar o sistema
- **Case/gabinete** - Para proteção (opcional)

## 💻 Tecnologias Utilizadas

- **Arduino Framework** - Desenvolvimento do firmware para ESP32
- **Node.js** - Servidor ponte para comunicação com APIs
- **Express.js** - Framework web para o servidor
- **API do Mercado Pago** - Processamento de pagamentos
- **HTTP/REST** - Comunicação entre componentes
- **JSON** - Formato de dados
- **GitHub** - Controle de versão e hospedagem do código
- **Heroku/Railway** - Deploy do servidor (opcional)

## ⚙️ Como Configurar

### 1. Configurar Aplicação no Mercado Pago
- Criar conta de desenvolvedor no Mercado Pago
- Obter Access Token de produção
- Configurar URL do webhook para notificações

### 2. Deploy do Servidor Ponte
- Configurar variáveis de ambiente (Access Token, porta, etc.)
- Fazer deploy em plataforma cloud (Heroku, Railway, etc.)
- Testar endpoints de webhook e consulta

### 3. Configurar e Gravar Firmware no ESP32
- Instalar bibliotecas necessárias (WiFi, LiquidCrystal_I2C, HTTPClient)
- Configurar credenciais WiFi e URL do servidor
- Gravar firmware no ESP32 via Arduino IDE ou PlatformIO

### 4. Montagem do Hardware
- Conectar display LCD via I2C ao ESP32
- Testar comunicação e funcionamento do sistema

## 📸 Fotos do Projeto

![Foto do Projeto](docs/foto_projeto.jpg)

## 📋 Status do Projeto

🚧 **Em Desenvolvimento** - Primeira versão em construção

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

**Desenvolvido com ❤️ para a comunidade de desenvolvedores que amam café!**
