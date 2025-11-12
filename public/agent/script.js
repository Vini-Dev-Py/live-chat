/**
 * Agent dashboard JavaScript
 * Handles ticket management and WebSocket communication
 */

let socket = null;
let currentCompanyId = 'company-1';
let currentTicketId = null;
let agentName = 'Atendente';
let tickets = [];
let currentFilter = 'all';
let typingTimeout = null;

// DOM elements
const companySelect = document.getElementById('company-select');
const agentNameInput = document.getElementById('agent-name');
const ticketsList = document.getElementById('tickets-list');
const refreshBtn = document.getElementById('refresh-tickets');
const filterTabs = document.querySelectorAll('.filter-tab');
const noTicketSelected = document.getElementById('no-ticket-selected');
const ticketChat = document.getElementById('ticket-chat');
const chatCustomerName = document.getElementById('chat-customer-name');
const chatTicketId = document.getElementById('chat-ticket-id');
const ticketStatusSelect = document.getElementById('ticket-status');
const chatMessages = document.getElementById('chat-messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const typingIndicator = document.getElementById('typing-indicator');
const openTicketsEl = document.getElementById('open-tickets');
const totalTicketsEl = document.getElementById('total-tickets');
const attachButton = document.getElementById('attach-button');
const fileInput = document.getElementById('file-input');
const emojiButton = document.getElementById('emoji-button');
const emojiPicker = document.getElementById('emoji-picker');
const dropZone = document.getElementById('drop-zone');

// Initialize
loadTickets();
connectWebSocket();

// Company selection
companySelect.addEventListener('change', () => {
  currentCompanyId = companySelect.value;
  currentTicketId = null;
  tickets = [];
  showNoTicketSelected();
  loadTickets();
  
  // Reconnect WebSocket with new company
  if (socket) {
    socket.disconnect();
    connectWebSocket();
  }
});

// Agent name
agentNameInput.addEventListener('change', () => {
  agentName = agentNameInput.value.trim() || 'Atendente';
});

// Refresh tickets
refreshBtn.addEventListener('click', () => {
  loadTickets();
});

// Filter tabs
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.status;
    renderTickets();
  });
});

// Load tickets
async function loadTickets() {
  try {
    const response = await fetch(`/api/tickets/${currentCompanyId}`);
    if (!response.ok) throw new Error('Failed to load tickets');
    
    const data = await response.json();
    tickets = data.tickets;
    renderTickets();
    updateStats();
  } catch (error) {
    console.error('Error loading tickets:', error);
  }
}

// Render tickets
function renderTickets() {
  const filteredTickets = tickets.filter(ticket => {
    if (currentFilter === 'all') return true;
    return ticket.status === currentFilter;
  });
  
  if (filteredTickets.length === 0) {
    ticketsList.innerHTML = `
      <div class="empty-state">
        <p>Nenhum ticket encontrado</p>
        <small>Aguardando novos atendimentos...</small>
      </div>
    `;
    return;
  }
  
  ticketsList.innerHTML = filteredTickets.map(ticket => {
    const time = new Date(ticket.updatedAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <div class="ticket-item ${ticket.id === currentTicketId ? 'active' : ''}" data-ticket-id="${ticket.id}">
        <div class="ticket-item-header">
          <div class="ticket-customer">${escapeHtml(ticket.customerName)}</div>
          <span class="ticket-status-badge ${ticket.status}">${ticket.status === 'open' ? 'Aberto' : 'Fechado'}</span>
        </div>
        <div class="ticket-id">${ticket.id}</div>
        <div class="ticket-time">Atualizado em ${time}</div>
      </div>
    `;
  }).join('');
  
  // Add click listeners
  document.querySelectorAll('.ticket-item').forEach(item => {
    item.addEventListener('click', () => {
      const ticketId = item.dataset.ticketId;
      selectTicket(ticketId);
    });
  });
}

// Update stats
function updateStats() {
  const openTickets = tickets.filter(t => t.status === 'open').length;
  openTicketsEl.textContent = openTickets;
  totalTicketsEl.textContent = tickets.length;
}

// Select ticket
async function selectTicket(ticketId) {
  if (currentTicketId === ticketId) return;
  
  // Leave previous ticket room
  if (currentTicketId && socket) {
    socket.emit('leave-ticket', { ticketId: currentTicketId });
  }
  
  currentTicketId = ticketId;
  
  try {
    const response = await fetch(`/api/tickets/${currentCompanyId}/${ticketId}`);
    if (!response.ok) throw new Error('Failed to load ticket');
    
    const data = await response.json();
    
    // Update UI
    chatCustomerName.textContent = data.ticket.customerName;
    chatTicketId.textContent = `#${data.ticket.id}`;
    ticketStatusSelect.value = data.ticket.status;
    
    // Clear messages
    chatMessages.innerHTML = '';
    
    // Load messages
    data.messages.forEach(message => {
      addMessage(message);
    });
    
    // Show chat
    noTicketSelected.style.display = 'none';
    ticketChat.style.display = 'flex';
    
    // Update ticket list
    renderTickets();
    
    // Join ticket room via WebSocket
    if (socket && socket.connected) {
      socket.emit('join-ticket', {
        companyId: currentCompanyId,
        ticketId: currentTicketId,
        userType: 'agent',
        userName: agentName
      });
    }
    
  } catch (error) {
    console.error('Error selecting ticket:', error);
    alert('Erro ao carregar ticket');
  }
}

// Show no ticket selected
function showNoTicketSelected() {
  noTicketSelected.style.display = 'flex';
  ticketChat.style.display = 'none';
  chatMessages.innerHTML = '';
}

// Ticket status change
ticketStatusSelect.addEventListener('change', async () => {
  if (!currentTicketId) return;
  
  const newStatus = ticketStatusSelect.value;
  
  try {
    const response = await fetch(`/api/tickets/${currentCompanyId}/${currentTicketId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) throw new Error('Failed to update status');
    
    // Update local ticket
    const ticket = tickets.find(t => t.id === currentTicketId);
    if (ticket) {
      ticket.status = newStatus;
      renderTickets();
      updateStats();
    }
    
  } catch (error) {
    console.error('Error updating ticket status:', error);
    alert('Erro ao atualizar status do ticket');
  }
});

// Connect to WebSocket
function connectWebSocket() {
  socket = io();
  
  socket.on('connect', () => {
    console.log('WebSocket connected');
    
    // Join company room to receive updates
    socket.emit('join-company', { companyId: currentCompanyId });
    
    // If a ticket is selected, join its room
    if (currentTicketId) {
      socket.emit('join-ticket', {
        companyId: currentCompanyId,
        ticketId: currentTicketId,
        userType: 'agent',
        userName: agentName
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });
  
  socket.on('error', (data) => {
    console.error('WebSocket error:', data);
  });
  
  socket.on('ticket:history', (data) => {
    // Load previous messages when joining a ticket
    chatMessages.innerHTML = '';
    data.messages.forEach(message => {
      addMessage(message);
    });
  });
  
  socket.on('message:received', (data) => {
    addMessage(data.message);
    
    // Update ticket in list
    const ticket = tickets.find(t => t.id === data.message.ticketId);
    if (ticket) {
      ticket.updatedAt = data.message.timestamp;
      renderTickets();
    }
  });
  
  socket.on('ticket:updated', (data) => {
    // New activity on a ticket
    loadTickets();
  });
  
  socket.on('ticket:status-updated', (data) => {
    const ticket = tickets.find(t => t.id === data.ticketId);
    if (ticket) {
      ticket.status = data.status;
      renderTickets();
      updateStats();
      
      if (currentTicketId === data.ticketId) {
        ticketStatusSelect.value = data.status;
      }
    }
  });
  
  socket.on('typing:update', (data) => {
    if (data.isTyping) {
      typingIndicator.style.display = 'flex';
    } else {
      typingIndicator.style.display = 'none';
    }
  });
  
  socket.on('user:joined', (data) => {
    if (data.userType === 'customer') {
      addSystemMessage(`${data.userName} entrou no chat`);
      // Reload tickets as there might be a new one
      loadTickets();
    }
  });
  
  socket.on('user:left', (data) => {
    if (data.userType === 'customer') {
      addSystemMessage('O cliente saiu do chat');
    }
  });
}

// Send message
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const content = messageInput.value.trim();
  if (!content || !socket || !socket.connected || !currentTicketId) return;
  
  socket.emit('message:send', {
    ticketId: currentTicketId,
    sender: agentName,
    senderType: 'agent',
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
if (ticketChat) {
  ticketChat.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentTicketId) {
      dropZone.style.display = 'flex';
    }
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
    if (files.length > 0 && currentTicketId) {
      await uploadFile(files[0]);
    }
  });
}

// Upload file function
async function uploadFile(file) {
  if (!currentTicketId) {
    alert('Selecione um ticket primeiro.');
    return;
  }
  
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
      sender: agentName,
      senderType: 'agent',
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
  if (!socket || !socket.connected || !currentTicketId) return;
  
  // Clear previous timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  // Emit typing start
  socket.emit('typing:start', {
    ticketId: currentTicketId,
    userName: agentName
  });
  
  // Set timeout to emit typing stop
  typingTimeout = setTimeout(stopTyping, 2000);
});

function stopTyping() {
  if (socket && socket.connected && currentTicketId) {
    socket.emit('typing:stop', {
      ticketId: currentTicketId,
      userName: agentName
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
    <div class="message-sender">${escapeHtml(message.sender)}</div>
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

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Poll for new tickets periodically
setInterval(() => {
  loadTickets();
}, 10000); // Every 10 seconds

// Initialize emoji picker
initEmojiPicker();
