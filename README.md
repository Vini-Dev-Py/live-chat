# Live Chat - Sistema de Atendimento Multi-Empresa

Sistema de chat ao vivo em tempo real com suporte multi-empresa, construído como um monólito com três componentes principais: backend central com HTTP e WebSocket, site do cliente com widget de chat flutuante, e plataforma de atendimento para agentes.

## 🚀 Características

- **Multi-empresa**: Isolamento completo de dados entre empresas
- **Tempo Real**: Comunicação instantânea via WebSocket (Socket.io)
- **Widget Flutuante**: Chat widget responsivo que abre no canto inferior direito
- **Dashboard de Atendentes**: Plataforma completa para gestão de tickets
- **In-Memory Storage**: Armazenamento em memória (sem banco de dados) para MVP
- **Indicadores de Digitação**: Visualização em tempo real quando alguém está digitando
- **Status de Tickets**: Gerenciamento de status (aberto/fechado)

## 📁 Estrutura do Projeto

```
live-chat/
├── src/
│   ├── server/          # Servidor Express e Socket.io
│   │   └── index.js     # Servidor principal
│   └── data/            # Armazenamento de dados
│       └── store.js     # Store em memória
├── public/
│   ├── customer/        # Site do cliente
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── script.js
│   └── agent/           # Dashboard dos atendentes
│       ├── index.html
│       ├── styles.css
│       └── script.js
└── package.json
```

## 🛠️ Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd live-chat

# Instale as dependências
npm install
```

## 🎯 Como Usar

### Iniciar o Servidor

```bash
npm start
```

O servidor será iniciado em `http://localhost:3000`

### Acessar as Aplicações

1. **Site do Cliente (Widget de Chat)**: http://localhost:3000/
   - Selecione uma empresa (Empresa 1 ou Empresa 2)
   - Clique no botão flutuante de chat no canto inferior direito
   - Digite seu nome e inicie o chat

2. **Dashboard de Atendentes**: http://localhost:3000/agent
   - Selecione a empresa que deseja atender
   - Digite seu nome como atendente
   - Veja a lista de tickets e selecione um para atender

## 🏢 Multi-Empresa

O sistema vem com duas empresas pré-configuradas para demonstração:

- **Empresa 1**: ID `company-1`, API Key: `api-key-company-1`
- **Empresa 2**: ID `company-2`, API Key: `api-key-company-2`

### Isolamento de Dados

- Cada empresa tem seus próprios tickets e mensagens
- Atendentes da Empresa 1 não podem ver tickets da Empresa 2
- O isolamento é garantido tanto na API REST quanto no WebSocket

## 🔌 API REST

### Endpoints Disponíveis

- `GET /api/health` - Health check
- `GET /api/companies` - Listar todas as empresas
- `GET /api/company/:apiKey` - Obter empresa por API key
- `POST /api/tickets` - Criar novo ticket
- `GET /api/tickets/:companyId` - Listar tickets de uma empresa
- `GET /api/tickets/:companyId/:ticketId` - Obter detalhes de um ticket
- `PUT /api/tickets/:companyId/:ticketId/status` - Atualizar status do ticket

## 🔄 WebSocket Events

### Eventos do Cliente

- `join-ticket` - Entrar em uma sala de ticket
- `message:send` - Enviar mensagem
- `typing:start` - Iniciar indicador de digitação
- `typing:stop` - Parar indicador de digitação

### Eventos do Servidor

- `ticket:history` - Histórico de mensagens do ticket
- `message:received` - Nova mensagem recebida
- `typing:update` - Atualização de indicador de digitação
- `user:joined` - Usuário entrou no ticket
- `user:left` - Usuário saiu do ticket
- `ticket:updated` - Ticket foi atualizado
- `ticket:status-updated` - Status do ticket foi atualizado

## 💾 Armazenamento de Dados

Todos os dados são armazenados em memória usando estruturas JavaScript:

- **Companies**: Map de empresas
- **Tickets**: Map de tickets com informações do cliente
- **Messages**: Map de mensagens associadas a tickets
- **Connections**: Map de conexões WebSocket ativas

**Nota**: Como os dados são em memória, eles serão perdidos quando o servidor reiniciar.

## 🎨 Interface

### Widget do Cliente

- Design moderno e responsivo
- Botão flutuante no canto inferior direito
- Animações suaves
- Suporte para mobile

### Dashboard do Atendente

- Lista de tickets com filtros (Todos/Abertos/Fechados)
- Estatísticas em tempo real
- Interface de chat completa
- Gerenciamento de status de tickets
- Atualização automática de novos tickets

## 🔒 Segurança

- Validação de empresa em todas as operações
- Isolamento de dados por empresa
- Verificação de permissões em WebSocket
- Escape de HTML para prevenir XSS

## 🚧 Limitações do MVP

- Dados apenas em memória (não persistente)
- Sem autenticação de usuários
- Sem criptografia de mensagens
- Sem upload de arquivos
- Sem histórico de conversas após restart

## 📝 Próximos Passos

Para evoluir este MVP, considere:

1. Adicionar banco de dados (MongoDB, PostgreSQL, etc.)
2. Implementar autenticação e autorização
3. Adicionar upload de arquivos
4. Implementar notificações push
5. Adicionar métricas e analytics
6. Implementar rate limiting
7. Adicionar testes automatizados

## 📄 Licença

ISC

## 👥 Contribuindo

Pull requests são bem-vindos. Para mudanças importantes, abra uma issue primeiro para discutir o que você gostaria de mudar.