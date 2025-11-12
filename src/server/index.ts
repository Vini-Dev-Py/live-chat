/**
 * Main server file for the live chat monolith
 * Handles HTTP API and WebSocket connections
 */

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import multer from 'multer';
import dataStore from '../data/store';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// CORS for development
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Company-Id');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================
// HTTP API ROUTES
// ============================================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all companies (for demo purposes)
app.get('/api/companies', (req: Request, res: Response) => {
  const companies = dataStore.getAllCompanies();
  res.json({ companies });
});

// Get company by API key
app.get('/api/company/:apiKey', (req: Request, res: Response) => {
  const company = dataStore.getCompanyByApiKey(req.params.apiKey);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }
  res.json({ company });
});

// Create a new ticket (called by customer widget)
app.post('/api/tickets', (req: Request, res: Response) => {
  const { companyId, customerId, customerName } = req.body;
  
  if (!companyId || !customerId || !customerName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const company = dataStore.getCompany(companyId);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  const ticket = dataStore.createTicket(companyId, customerId, customerName);
  res.json({ ticket });
});

// Get tickets for a company (for agent dashboard)
app.get('/api/tickets/:companyId', (req: Request, res: Response) => {
  const { companyId } = req.params;
  const tickets = dataStore.getTicketsByCompany(companyId);
  res.json({ tickets });
});

// Get ticket details with messages
app.get('/api/tickets/:companyId/:ticketId', (req: Request, res: Response) => {
  const { companyId, ticketId } = req.params;
  const ticket = dataStore.getTicket(ticketId);
  
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  // Security: Ensure ticket belongs to the company
  if (ticket.companyId !== companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const messages = dataStore.getMessagesByTicket(ticketId);
  res.json({ ticket, messages });
});

// Update ticket status
app.put('/api/tickets/:companyId/:ticketId/status', (req: Request, res: Response) => {
  const { companyId, ticketId } = req.params;
  const { status } = req.body;
  
  const ticket = dataStore.getTicket(ticketId);
  
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  
  // Security: Ensure ticket belongs to the company
  if (ticket.companyId !== companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const updatedTicket = dataStore.updateTicketStatus(ticketId, status);
  
  // Notify all connections in this ticket
  io.to(`ticket-${ticketId}`).emit('ticket:status-updated', {
    ticketId,
    status
  });
  
  res.json({ ticket: updatedTicket });
});

// Upload file endpoint
app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileUrl = `/uploads/${req.file.filename}`;
  const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
  
  res.json({
    success: true,
    file: {
      url: fileUrl,
      type: fileType,
      filename: req.file.originalname,
      size: req.file.size
    }
  });
});

// ============================================
// WEBSOCKET HANDLERS
// ============================================

interface JoinTicketData {
  companyId: string;
  ticketId: string;
  userType: 'customer' | 'agent';
  userName: string;
}

interface MessageSendData {
  ticketId: string;
  sender: string;
  senderType: 'customer' | 'agent';
  content: string;
  mediaType?: 'image' | 'video' | null;
  mediaUrl?: string | null;
}

interface TypingData {
  ticketId: string;
  userName: string;
}

io.on('connection', (socket: Socket) => {
  console.log('New WebSocket connection:', socket.id);
  
  // Join a ticket room
  socket.on('join-ticket', (data: JoinTicketData) => {
    const { companyId, ticketId, userType, userName } = data;
    const ticket = dataStore.getTicket(ticketId);
    
    if (!ticket) {
      socket.emit('error', { message: 'Ticket not found' });
      return;
    }
    
    // Security: Ensure ticket belongs to the company
    if (ticket.companyId !== companyId) {
      socket.emit('error', { message: 'Access denied' });
      return;
    }
    
    // Join the ticket room
    socket.join(`ticket-${ticketId}`);
    socket.join(`company-${companyId}`);
    
    // Store connection info
    dataStore.addConnection(socket.id, companyId, ticketId, userType);
    
    console.log(`${userType} ${userName} joined ticket ${ticketId}`);
    
    // Send ticket history
    const messages = dataStore.getMessagesByTicket(ticketId);
    socket.emit('ticket:history', { messages });
    
    // Notify others in the room
    socket.to(`ticket-${ticketId}`).emit('user:joined', {
      userType,
      userName,
      timestamp: new Date().toISOString()
    });
  });
  
  // Send a message
  socket.on('message:send', (data: MessageSendData) => {
    const { ticketId, sender, senderType, content, mediaType, mediaUrl } = data;
    const connection = dataStore.getConnection(socket.id);
    
    if (!connection) {
      socket.emit('error', { message: 'Not connected to a ticket' });
      return;
    }
    
    // Security: Ensure the socket is actually in this ticket
    if (connection.ticketId !== ticketId) {
      socket.emit('error', { message: 'Access denied' });
      return;
    }
    
    // Create the message
    const message = dataStore.createMessage(
      ticketId,
      sender,
      senderType,
      content,
      mediaType || null,
      mediaUrl || null
    );
    
    // Broadcast to all users in the ticket room
    io.to(`ticket-${ticketId}`).emit('message:received', { message });
    
    // Notify agents in the company about new activity
    const ticket = dataStore.getTicket(ticketId);
    if (ticket) {
      socket.to(`company-${ticket.companyId}`).emit('ticket:updated', {
        ticketId,
        lastMessage: message
      });
    }
  });
  
  // Typing indicator
  socket.on('typing:start', (data: TypingData) => {
    const { ticketId, userName } = data;
    socket.to(`ticket-${ticketId}`).emit('typing:update', {
      userName,
      isTyping: true
    });
  });
  
  socket.on('typing:stop', (data: TypingData) => {
    const { ticketId, userName } = data;
    socket.to(`ticket-${ticketId}`).emit('typing:update', {
      userName,
      isTyping: false
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    const connection = dataStore.getConnection(socket.id);
    
    if (connection) {
      console.log(`User disconnected from ticket ${connection.ticketId}`);
      
      // Notify others in the ticket
      socket.to(`ticket-${connection.ticketId}`).emit('user:left', {
        userType: connection.userType,
        timestamp: new Date().toISOString()
      });
      
      dataStore.removeConnection(socket.id);
    }
  });
});

// ============================================
// SERVE STATIC PAGES
// ============================================

// Root redirects to customer
app.get('/', (req: Request, res: Response) => {
  res.redirect('/customer');
});

// Serve customer React app static files
app.use('/customer', express.static(path.join(__dirname, '../../client-customer/build')));

// Serve agent React app static files
app.use('/agent', express.static(path.join(__dirname, '../../client-agent/build')));

// Customer app catch-all route for client-side routing
app.get(/^\/customer/, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../client-customer/build/index.html'));
});

// Agent app catch-all route for client-side routing
app.get(/^\/agent/, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../client-agent/build/index.html'));
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`\n🚀 Live Chat Server running on http://localhost:${PORT}`);
  console.log(`📱 Customer site: http://localhost:${PORT}/`);
  console.log(`👨‍💼 Agent dashboard: http://localhost:${PORT}/agent`);
  console.log(`\n📊 Sample Companies:`);
  dataStore.getAllCompanies().forEach(company => {
    // Note: API keys logged for demo/testing purposes only
    console.log(`   - ${company.name} (ID: ${company.id}, API Key: ${company.apiKey})`);
  });
  console.log('');
});

export { app, server, io };
