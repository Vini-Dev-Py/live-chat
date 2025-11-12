/**
 * Customer chat widget JavaScript
 * Handles chat UI and WebSocket communication
 */

let socket = null;
let currentCompanyId = 'company-1';
let currentTicketId = null;
let customerName = null;
let typingTimeout = null;

// DOM elements
const chatToggle = document.getElementById('chat-toggle');
const chatWidget = document.getElementById('chat-widget');
const chatClose = document.getElementById('chat-close');
const chatWelcome = document.getElementById('chat-welcome');
const chatConversation = document.getElementById('chat-conversation');
const startChatForm = document.getElementById('start-chat-form');
const customerNameInput = document.getElementById('customer-name');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');
const chatStatus = document.getElementById('chat-status');
const typingIndicator = document.getElementById('typing-indicator');
const attachButton = document.getElementById('attach-button');
const fileInput = document.getElementById('file-input');
const emojiButton = document.getElementById('emoji-button');
const emojiPicker = document.getElementById('emoji-picker');
const dropZone = document.getElementById('drop-zone');

// Toggle chat widget
chatToggle.addEventListener('click', () => {
  chatWidget.classList.toggle('open');
  if (chatWidget.classList.contains('open') && socket && socket.connected) {
    updateStatus('online');
  }
});

chatClose.addEventListener('click', () => {
  chatWidget.classList.remove('open');
});

// Set company (for demo purposes)
window.setCompany = (companyId) => {
  currentCompanyId = companyId;
  document.getElementById('selected-company').innerHTML = 
    `Empresa selecionada: <strong>${companyId === 'company-1' ? 'Empresa 1' : 'Empresa 2'}</strong>`;
  
  // Reset chat if it was already started
  if (currentTicketId) {
    if (socket) {
      socket.disconnect();
    }
    resetChat();
  }
};

// Start chat
startChatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  customerName = customerNameInput.value.trim();
  if (!customerName) return;
  
  try {
    // Create a ticket
    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        companyId: currentCompanyId,
        customerId: `customer-${Date.now()}`,
        customerName: customerName
      })
    });
    
    if (!response.ok) throw new Error('Failed to create ticket');
    
    const data = await response.json();
    currentTicketId = data.ticket.id;
    
    // Connect to WebSocket
    connectWebSocket();
    
    // Show conversation
    chatWelcome.style.display = 'none';
    chatConversation.style.display = 'flex';
    
  } catch (error) {
    console.error('Error starting chat:', error);
    alert('Erro ao iniciar o chat. Tente novamente.');
  }
});

// Connect to WebSocket
function connectWebSocket() {
  socket = io();
  
  socket.on('connect', () => {
    console.log('WebSocket connected');
    updateStatus('online');
    
    // Join the ticket room
    socket.emit('join-ticket', {
      companyId: currentCompanyId,
      ticketId: currentTicketId,
      userType: 'customer',
      userName: customerName
    });
  });
  
  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
    updateStatus('offline');
  });
  
  socket.on('error', (data) => {
    console.error('WebSocket error:', data);
    alert(data.message);
  });
  
  socket.on('ticket:history', (data) => {
    // Load previous messages
    data.messages.forEach(message => {
      addMessage(message);
    });
  });
  
  socket.on('message:received', (data) => {
    addMessage(data.message);
  });
  
  socket.on('typing:update', (data) => {
    if (data.isTyping) {
      typingIndicator.style.display = 'flex';
    } else {
      typingIndicator.style.display = 'none';
    }
  });
  
  socket.on('user:joined', (data) => {
    if (data.userType === 'agent') {
      addSystemMessage(`${data.userName} entrou no chat`);
    }
  });
  
  socket.on('user:left', (data) => {
    if (data.userType === 'agent') {
      addSystemMessage('O atendente saiu do chat');
    }
  });
}

// Send message
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const content = messageInput.value.trim();
  if (!content || !socket || !socket.connected) return;
  
  socket.emit('message:send', {
    ticketId: currentTicketId,
    sender: customerName,
    senderType: 'customer',
    content: content
  });
  
  messageInput.value = '';
  stopTyping();
});

// Attach button handler
attachButton.addEventListener('click', () => {
  fileInput.click();
});

// File input handler
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  await uploadFile(file);
  fileInput.value = '';
});

// Emoji button handler
emojiButton.addEventListener('click', (e) => {
  e.stopPropagation();
  emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiButton) {
    emojiPicker.style.display = 'none';
  }
});

// Initialize emoji picker
function initEmojiPicker() {
  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐'];
  
  const grid = emojiPicker.querySelector('.emoji-grid');
  grid.innerHTML = '';
  
  emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.className = 'emoji-item';
    span.textContent = emoji;
    span.addEventListener('click', () => {
      messageInput.value += emoji;
      messageInput.focus();
      emojiPicker.style.display = 'none';
    });
    grid.appendChild(span);
  });
}

// Drag and drop handlers
chatConversation.addEventListener('dragenter', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.style.display = 'flex';
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.target === dropZone) {
    dropZone.style.display = 'none';
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.style.display = 'none';
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    await uploadFile(files[0]);
  }
});

// Upload file function
async function uploadFile(file) {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg'];
  if (!allowedTypes.includes(file.type)) {
    alert('Apenas imagens e vídeos são permitidos.');
    return;
  }
  
  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('O arquivo deve ter no máximo 10MB.');
    return;
  }
  
  // Show uploading message
  const uploadingMsg = addSystemMessage('Enviando arquivo...');
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    
    const data = await response.json();
    
    // Remove uploading message
    uploadingMsg.remove();
    
    // Send media message via WebSocket
    socket.emit('message:send', {
      ticketId: currentTicketId,
      sender: customerName,
      senderType: 'customer',
      content: file.name,
      mediaType: data.file.type,
      mediaUrl: data.file.url
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    uploadingMsg.remove();
    alert('Erro ao enviar arquivo. Tente novamente.');
  }
}

// Typing indicators
messageInput.addEventListener('input', () => {
  if (!socket || !socket.connected) return;
  
  // Clear previous timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  // Emit typing start
  socket.emit('typing:start', {
    ticketId: currentTicketId,
    userName: customerName
  });
  
  // Set timeout to emit typing stop
  typingTimeout = setTimeout(stopTyping, 2000);
});

function stopTyping() {
  if (socket && socket.connected) {
    socket.emit('typing:stop', {
      ticketId: currentTicketId,
      userName: customerName
    });
  }
}

// Add message to chat
function addMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.senderType}`;
  
  const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let contentHtml = '';
  if (message.mediaType === 'image') {
    contentHtml = `<img src="${message.mediaUrl}" alt="${escapeHtml(message.content)}" class="message-media message-image" onclick="window.open('${message.mediaUrl}', '_blank')">`;
  } else if (message.mediaType === 'video') {
    contentHtml = `<video src="${message.mediaUrl}" controls class="message-media message-video"></video>`;
  } else {
    contentHtml = `<div class="message-content">${escapeHtml(message.content)}</div>`;
  }
  
  messageDiv.innerHTML = `
    <div class="message-sender">${message.sender}</div>
    ${contentHtml}
    <div class="message-time">${time}</div>
  `;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add system message
function addSystemMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = 'text-align: center; color: #999; font-size: 0.85em; padding: 10px;';
  messageDiv.textContent = text;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageDiv;
}

// Update status
function updateStatus(status) {
  if (status === 'online') {
    chatStatus.textContent = 'Online';
    chatStatus.classList.add('online');
  } else {
    chatStatus.textContent = 'Offline';
    chatStatus.classList.remove('online');
  }
}

// Reset chat
function resetChat() {
  currentTicketId = null;
  customerName = null;
  chatMessages.innerHTML = '';
  customerNameInput.value = '';
  messageInput.value = '';
  chatWelcome.style.display = 'flex';
  chatConversation.style.display = 'none';
  updateStatus('offline');
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
updateStatus('offline');
initEmojiPicker();
