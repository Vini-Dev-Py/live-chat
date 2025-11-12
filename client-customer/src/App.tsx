import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { io, Socket } from 'socket.io-client';

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

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentCompanyId, setCurrentCompanyId] = useState('company-1');
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  
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

  const connectWebSocket = (ticketId: string, name: string) => {
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      socket.emit('join-ticket', {
        companyId: currentCompanyId,
        ticketId: ticketId,
        userType: 'customer',
        userName: name
      });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('error', (data: { message: string }) => {
      console.error('WebSocket error:', data);
      alert(data.message);
    });

    socket.on('ticket:history', (data: { messages: Message[] }) => {
      setMessages(data.messages);
    });

    socket.on('message:received', (data: { message: Message }) => {
      setMessages(prev => [...prev, data.message]);
    });

    socket.on('typing:update', (data: { userName: string; isTyping: boolean }) => {
      setIsTyping(data.isTyping);
    });

    socket.on('user:joined', (data: { userType: string; userName: string }) => {
      if (data.userType === 'agent') {
        const systemMsg: Message = {
          id: `system-${Date.now()}`,
          ticketId: ticketId,
          sender: 'Sistema',
          senderType: 'agent',
          content: `${data.userName} entrou no chat`,
          mediaType: null,
          mediaUrl: null,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, systemMsg]);
      }
    });

    socket.on('user:left', (data: { userType: string }) => {
      if (data.userType === 'agent') {
        const systemMsg: Message = {
          id: `system-${Date.now()}`,
          ticketId: ticketId,
          sender: 'Sistema',
          senderType: 'agent',
          content: 'O atendente saiu do chat',
          mediaType: null,
          mediaUrl: null,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, systemMsg]);
      }
    });
  };

  const handleStartChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: currentCompanyId,
          customerId: `customer-${Date.now()}`,
          customerName: customerName.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to create ticket');

      const data = await response.json();
      setCurrentTicketId(data.ticket.id);
      connectWebSocket(data.ticket.id, customerName.trim());
      setChatStarted(true);
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Erro ao iniciar o chat. Tente novamente.');
    }
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || !socketRef.current || !currentTicketId) return;

    socketRef.current.emit('message:send', {
      ticketId: currentTicketId,
      sender: customerName,
      senderType: 'customer',
      content: content
    });

    setMessageInput('');
    stopTyping();
  };

  const startTyping = () => {
    if (!socketRef.current || !currentTicketId) return;

    socketRef.current.emit('typing:start', {
      ticketId: currentTicketId,
      userName: customerName
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (!socketRef.current || !currentTicketId) return;

    socketRef.current.emit('typing:stop', {
      ticketId: currentTicketId,
      userName: customerName
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
      
      if (socketRef.current && currentTicketId) {
        socketRef.current.emit('message:send', {
          ticketId: currentTicketId,
          sender: customerName,
          senderType: 'customer',
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main website content */}
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Bem-vindo ao Nosso Site</h1>
          <p className="text-xl text-gray-600">Esta é uma demonstração de site com chat ao vivo</p>
        </header>

        <main className="max-w-4xl mx-auto">
          <section className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Precisa de ajuda?</h2>
            <p className="text-lg text-gray-600">Clique no botão de chat no canto inferior direito para falar conosco!</p>
          </section>

          <section className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-2">Rápido</h3>
              <p className="text-gray-600">Resposta em tempo real</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold mb-2">Fácil</h3>
              <p className="text-gray-600">Chat simples e intuitivo</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-2">Seguro</h3>
              <p className="text-gray-600">Dados isolados por empresa</p>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Selecione uma empresa para testar:</h3>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setCurrentCompanyId('company-1')}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  currentCompanyId === 'company-1'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Empresa 1
              </button>
              <button
                onClick={() => setCurrentCompanyId('company-2')}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  currentCompanyId === 'company-2'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Empresa 2
              </button>
            </div>
            <p className="text-gray-700">
              Empresa selecionada: <strong>{currentCompanyId === 'company-1' ? 'Empresa 1' : 'Empresa 2'}</strong>
            </p>
          </section>
        </main>
      </div>

      {/* Floating chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition flex items-center justify-center z-50"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      {/* Chat widget */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50">
          {/* Chat header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Chat ao Vivo</h3>
              <span className="text-sm">{isConnected ? 'Online' : 'Offline'}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-700 p-1 rounded"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {!chatStarted ? (
            /* Welcome screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <h3 className="text-2xl font-bold mb-2">Olá! 👋</h3>
              <p className="text-gray-600 mb-6 text-center">Como podemos ajudar você hoje?</p>
              <form onSubmit={handleStartChat} className="w-full">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Iniciar Chat
                </button>
              </form>
            </div>
          ) : (
            /* Chat conversation */
            <>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 flex ${message.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.senderType === 'customer'
                          ? 'bg-blue-600 text-white'
                          : message.sender === 'Sistema'
                          ? 'bg-gray-300 text-gray-700 text-center text-sm'
                          : 'bg-white text-gray-800'
                      }`}
                    >
                      {message.sender !== 'Sistema' && (
                        <div className="text-xs font-semibold mb-1 opacity-75">{message.sender}</div>
                      )}
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
                    <span>Digitando...</span>
                  </div>
                )}
              </div>

              {/* Message form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
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
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Anexar foto ou vídeo"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Adicionar emoji"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 right-0 bg-white border rounded-lg shadow-lg p-2 w-64 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-8 gap-1">
                        {emojis.map((emoji, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setMessageInput(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="text-2xl hover:bg-gray-100 p-1 rounded"
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
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
