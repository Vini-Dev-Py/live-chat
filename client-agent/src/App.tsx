import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  ChatCircle, 
  X, 
  PaperPlaneRight, 
  Smiley, 
  Plus, 
  ArrowsClockwise,
  User,
  CheckCircle,
  XCircle 
} from 'phosphor-react';

interface Message {
  id: string;
  ticketId: string;
  sender: string;
  senderType: 'customer' | 'agent';
  content: string;
  mediaType: 'image' | 'video' | null;
  mediaUrl: string | null;
  timestamp: string;
}

interface Ticket {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [currentCompanyId, setCurrentCompanyId] = useState('company-1');
  const [agentName, setAgentName] = useState('Atendente');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadTickets = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tickets/${currentCompanyId}`);
      if (!response.ok) throw new Error('Failed to load tickets');
      
      const data = await response.json();
      setTickets(data.tickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  }, [currentCompanyId]);

  const connectWebSocket = useCallback(() => {
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      socket.emit('join-company', { companyId: currentCompanyId });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('ticket:updated', () => {
      loadTickets();
    });

    socket.on('message:received', (data: { message: Message }) => {
      if (selectedTicket && data.message.ticketId === selectedTicket.id) {
        setMessages(prev => [...prev, data.message]);
      }
      loadTickets();
    });

    socket.on('typing:update', (data: { userName: string; isTyping: boolean }) => {
      setIsTyping(data.isTyping);
    });

    socket.on('ticket:status-updated', (data: { ticketId: string; status: 'open' | 'closed' }) => {
      if (selectedTicket && selectedTicket.id === data.ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: data.status } : null);
      }
      loadTickets();
    });
  }, [currentCompanyId, selectedTicket, loadTickets]);

  useEffect(() => {
    loadTickets();
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [loadTickets, connectWebSocket]);

  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setMessages([]);

    if (socketRef.current) {
      socketRef.current.emit('join-ticket', {
        companyId: currentCompanyId,
        ticketId: ticket.id,
        userType: 'agent',
        userName: agentName
      });
    }

    try {
      const response = await fetch(`${API_URL}/api/tickets/${currentCompanyId}/${ticket.id}`);
      if (!response.ok) throw new Error('Failed to load ticket details');
      
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading ticket details:', error);
    }
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || !socketRef.current || !selectedTicket) return;

    socketRef.current.emit('message:send', {
      ticketId: selectedTicket.id,
      sender: agentName,
      senderType: 'agent',
      content: content
    });

    setMessageInput('');
    stopTyping();
  };

  const startTyping = () => {
    if (!socketRef.current || !selectedTicket) return;

    socketRef.current.emit('typing:start', {
      ticketId: selectedTicket.id,
      userName: agentName
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (!socketRef.current || !selectedTicket) return;

    socketRef.current.emit('typing:stop', {
      ticketId: selectedTicket.id,
      userName: agentName
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleMessageInputChange = (value: string) => {
    setMessageInput(value);
    if (value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleStatusChange = async (status: 'open' | 'closed') => {
    if (!selectedTicket) return;

    try {
      const response = await fetch(`${API_URL}/api/tickets/${currentCompanyId}/${selectedTicket.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update ticket status');

      const data = await response.json();
      setSelectedTicket(data.ticket);
      loadTickets();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Erro ao atualizar status do ticket');
    }
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload file');

      const data = await response.json();
      
      if (socketRef.current && selectedTicket) {
        socketRef.current.emit('message:send', {
          ticketId: selectedTicket.id,
          sender: agentName,
          senderType: 'agent',
          content: data.file.filename,
          mediaType: data.file.type,
          mediaUrl: data.file.url
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Erro ao enviar arquivo. Tente novamente.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      e.target.value = '';
    }
  };

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '❤️', '🧡', '💛', '💚', '💙', '💜'];

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredTickets = tickets.filter(ticket => {
    if (currentFilter === 'all') return true;
    return ticket.status === currentFilter;
  });

  const openTicketsCount = tickets.filter(t => t.status === 'open').length;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
            <ChatCircle size={32} weight="fill" className="text-blue-600" />
            Live Chat
          </h1>
          <p className="text-gray-600">Plataforma de Atendimento</p>
        </div>

        <div className="p-4 border-b space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a Empresa:
            </label>
            <select
              value={currentCompanyId}
              onChange={(e) => setCurrentCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="company-1">Empresa 1</option>
              <option value="company-2">Empresa 2</option>
            </select>
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seu Nome:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Nome do Atendente"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <User size={20} weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
        </div>

        <div className="p-4 border-b grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Tickets Abertos</div>
            <div className="text-2xl font-bold text-blue-600">{openTicketsCount}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total de Tickets</div>
            <div className="text-2xl font-bold text-gray-800">{tickets.length}</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Tickets</h2>
              <button
                onClick={loadTickets}
                className="p-2 hover:bg-gray-100 rounded transition-all hover:rotate-180 duration-300"
                title="Atualizar"
              >
                <ArrowsClockwise size={16} weight="bold" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentFilter('all')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  currentFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setCurrentFilter('open')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  currentFilter === 'open'
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Abertos
              </button>
              <button
                onClick={() => setCurrentFilter('closed')}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  currentFilter === 'closed'
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Fechados
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>Nenhum ticket encontrado</p>
                <small>Aguardando novos atendimentos...</small>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => selectTicket(ticket)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-all ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50 border-l-4 border-l-blue-600 animate-fade-in' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-800 flex items-center gap-2">
                        <User size={16} weight="bold" className="text-gray-600" />
                        {ticket.customerName}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                        ticket.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status === 'open' ? (
                          <>
                            <CheckCircle size={12} weight="fill" />
                            Aberto
                          </>
                        ) : (
                          <>
                            <XCircle size={12} weight="fill" />
                            Fechado
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">#{ticket.id.slice(-8)}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatTime(ticket.updatedAt)}</div>
                  </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {!selectedTicket ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 animate-fade-in">
            <ChatCircle size={64} weight="light" className="mb-4" />
            <h3 className="text-xl font-bold mb-2">Selecione um ticket</h3>
            <p>Escolha um ticket da lista para iniciar o atendimento</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">{selectedTicket.customerName}</h3>
                <span className="text-sm text-gray-500">#{selectedTicket.id.slice(-8)}</span>
              </div>
              <div>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value as 'open' | 'closed')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Aberto</option>
                  <option value="closed">Fechado</option>
                </select>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 flex ${message.senderType === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.senderType === 'agent'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-75">{message.sender}</div>
                    {message.mediaUrl ? (
                      message.mediaType === 'image' ? (
                        <img src={`${API_URL}${message.mediaUrl}`} alt="Uploaded" className="rounded max-w-full" />
                      ) : (
                        <video src={`${API_URL}${message.mediaUrl}`} controls className="rounded max-w-full" />
                      )
                    ) : (
                      <div>{message.content}</div>
                    )}
                    <div className="text-xs mt-1 opacity-75">{formatTime(message.timestamp)}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
              {isTyping && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  <span>Cliente está digitando...</span>
                </div>
              )}
            </div>

            {/* Message form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Anexar foto ou vídeo"
              >
                <Plus size={20} weight="bold" />
              </button>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => handleMessageInputChange(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Adicionar emoji"
                >
                  <Smiley size={20} weight="bold" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-12 right-0 bg-white border rounded-lg shadow-lg p-2 w-64 max-h-48 overflow-y-auto z-10 animate-fade-in">
                    <div className="grid grid-cols-8 gap-1">
                      {emojis.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setMessageInput(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="text-2xl hover:bg-gray-100 p-1 rounded transition-transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:scale-105"
              >
                <PaperPlaneRight size={20} weight="fill" />
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
