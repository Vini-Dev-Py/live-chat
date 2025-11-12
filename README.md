# Live Chat - Sistema de Atendimento Multi-Empresa

Sistema de chat ao vivo em tempo real com suporte multi-empresa, construído com React, TypeScript e Tailwind CSS no frontend, e Node.js com TypeScript no backend.

## 🚀 Características

- **Multi-empresa**: Isolamento completo de dados entre empresas
- **Tempo Real**: Comunicação instantânea via WebSocket (Socket.io)
- **Widget Flutuante**: Chat widget responsivo que abre no canto inferior direito
- **Dashboard de Atendentes**: Plataforma completa para gestão de tickets
- **In-Memory Storage**: Armazenamento em memória (sem banco de dados) para MVP
- **Indicadores de Digitação**: Visualização em tempo real quando alguém está digitando
- **Status de Tickets**: Gerenciamento de status (aberto/fechado)
- **TypeScript**: Tipagem estática em todo o código (frontend e backend)
- **Tailwind CSS**: Estilização moderna e responsiva
- **React**: Interface de usuário reativa e componentizada

## 📁 Estrutura do Projeto

```
live-chat/
├── src/
│   ├── server/          # Servidor Express e Socket.io (TypeScript)
│   │   └── index.ts     # Servidor principal
│   └── data/            # Armazenamento de dados (TypeScript)
│       └── store.ts     # Store em memória
├── client-customer/     # Aplicação React do cliente
│   ├── src/
│   │   ├── App.tsx      # Componente principal
│   │   └── index.tsx    # Entry point
│   └── build/           # Build de produção
├── client-agent/        # Aplicação React do agente
│   ├── src/
│   │   ├── App.tsx      # Componente principal
│   │   └── index.tsx    # Entry point
│   └── build/           # Build de produção
├── dist/                # Backend compilado (gerado)
├── public/
│   └── uploads/         # Arquivos enviados
├── package.json         # Dependências do backend
└── tsconfig.json        # Configuração TypeScript do backend
```

## 🛠️ Tecnologias

### Backend
- Node.js
- TypeScript
- Express.js v5
- Socket.io
- Multer (upload de arquivos)

### Frontend
- React 19
- TypeScript
- Vite (build tool)
- Tailwind CSS v3
- Socket.io Client
- Phosphor Icons (biblioteca de ícones)

## 💻 Instalação

### Pré-requisitos
- Node.js (v16 ou superior)
- npm ou yarn

### Clone o repositório
```bash
git clone <repository-url>
cd live-chat
```

### Instale as dependências do backend
```bash
npm install
```

### Instale as dependências dos frontends
```bash
cd client-customer && npm install && cd ..
cd client-agent && npm install && cd ..
```

## 🎯 Como Usar

### Desenvolvimento

Para desenvolvimento, você pode executar cada aplicação separadamente:

**Backend (com hot-reload):**
```bash
npm run dev
```

**Frontend do Cliente (porta 3001) com Vite:**
```bash
npm run dev:customer
# ou diretamente: cd client-customer && npm run dev
```

**Frontend do Agente (porta 3002) com Vite:**
```bash
npm run dev:agent
# ou diretamente: cd client-agent && npm run dev
```

> **Nota**: O Vite oferece desenvolvimento mais rápido com Hot Module Replacement (HMR) instantâneo.

### Produção

Para produção, faça o build de todas as aplicações e inicie o servidor:

```bash
# Build completo (backend + frontends)
npm run build

# Iniciar servidor de produção
npm start
```

O servidor será iniciado em `http://localhost:3000`

### Acessar as Aplicações

1. **Site do Cliente (Widget de Chat)**: http://localhost:3000/customer/
   - Selecione uma empresa (Empresa 1 ou Empresa 2)
   - Clique no botão flutuante de chat no canto inferior direito
   - Digite seu nome e inicie o chat

2. **Dashboard de Atendentes**: http://localhost:3000/agent/
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

Todos os dados são armazenados em memória usando estruturas TypeScript:

- **Companies**: Map de empresas
- **Tickets**: Map de tickets com informações do cliente
- **Messages**: Map de mensagens associadas a tickets
- **Connections**: Map de conexões WebSocket ativas

**Nota**: Como os dados são em memória, eles serão perdidos quando o servidor reiniciar.

## 🎨 Interface

### Widget do Cliente (React + TypeScript + Vite + Tailwind CSS)

- Design moderno e responsivo com Tailwind CSS
- Ícones elegantes com Phosphor Icons
- Botão flutuante no canto inferior direito com animação
- Animações suaves (fade-in, slide-up, bounce)
- Transições fluidas em hover e interações
- Suporte para mobile
- Integração completa com Socket.IO para chat em tempo real

### Dashboard do Agente (React + TypeScript + Vite + Tailwind CSS)

- Lista de tickets com filtros (Todos/Abertos/Fechados)
- Estatísticas em tempo real
- Interface de chat completa com ícones Phosphor
- Gerenciamento de status de tickets
- Atualização automática de novos tickets
- Layout responsivo e moderno
- Animações e transições suaves

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
7. Adicionar testes automatizados (Jest, React Testing Library)
8. Implementar CI/CD
9. Adicionar testes E2E (Playwright, Cypress)

## 🧪 Scripts Disponíveis

### Backend
- `npm run build:backend` - Compila o TypeScript do backend
- `npm run dev` - Inicia o backend em modo desenvolvimento com hot-reload

### Frontend
- `npm run build:customer` - Build de produção do app cliente
- `npm run build:agent` - Build de produção do app agente
- `npm run dev:customer` - Inicia o app cliente em modo desenvolvimento (porta 3001)
- `npm run dev:agent` - Inicia o app agente em modo desenvolvimento (porta 3002)

### Geral
- `npm run build` - Build completo (backend + ambos frontends)
- `npm start` - Build completo e inicia o servidor de produção

## 📄 Licença

ISC

## 👥 Contribuindo

Pull requests são bem-vindos. Para mudanças importantes, abra uma issue primeiro para discutir o que você gostaria de mudar.