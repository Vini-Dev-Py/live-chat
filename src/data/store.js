/**
 * In-memory data store for the live chat application
 * Stores companies, tickets, messages, and connections
 */

class DataStore {
  constructor() {
    // Companies data structure: { companyId: { id, name, apiKey } }
    this.companies = new Map();
    
    // Tickets data structure: { ticketId: { id, companyId, customerId, customerName, status, createdAt, updatedAt } }
    this.tickets = new Map();
    
    // Messages data structure: { messageId: { id, ticketId, sender, senderType, content, timestamp } }
    this.messages = new Map();
    
    // Active connections: { socketId: { companyId, ticketId, userType } }
    this.connections = new Map();
    
    // Ticket to messages mapping for quick lookup
    this.ticketMessages = new Map();
    
    // Company to tickets mapping for quick lookup
    this.companyTickets = new Map();
    
    this._initializeSampleData();
  }
  
  _initializeSampleData() {
    // Create sample companies
    this.createCompany('company-1', 'Empresa 1', 'api-key-company-1');
    this.createCompany('company-2', 'Empresa 2', 'api-key-company-2');
  }
  
  // Company methods
  createCompany(id, name, apiKey) {
    const company = { id, name, apiKey };
    this.companies.set(id, company);
    this.companyTickets.set(id, new Set());
    return company;
  }
  
  getCompany(companyId) {
    return this.companies.get(companyId);
  }
  
  getCompanyByApiKey(apiKey) {
    for (const company of this.companies.values()) {
      if (company.apiKey === apiKey) {
        return company;
      }
    }
    return null;
  }
  
  getAllCompanies() {
    return Array.from(this.companies.values());
  }
  
  // Ticket methods
  createTicket(companyId, customerId, customerName) {
    const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ticket = {
      id: ticketId,
      companyId,
      customerId,
      customerName,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.tickets.set(ticketId, ticket);
    this.ticketMessages.set(ticketId, []);
    
    const companyTickets = this.companyTickets.get(companyId);
    if (companyTickets) {
      companyTickets.add(ticketId);
    }
    
    return ticket;
  }
  
  getTicket(ticketId) {
    return this.tickets.get(ticketId);
  }
  
  getTicketsByCompany(companyId) {
    const ticketIds = this.companyTickets.get(companyId);
    if (!ticketIds) return [];
    
    return Array.from(ticketIds)
      .map(id => this.tickets.get(id))
      .filter(ticket => ticket !== undefined)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  
  updateTicketStatus(ticketId, status) {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
      return ticket;
    }
    return null;
  }
  
  // Message methods
  createMessage(ticketId, sender, senderType, content, mediaType = null, mediaUrl = null) {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      id: messageId,
      ticketId,
      sender,
      senderType, // 'customer' or 'agent'
      content,
      mediaType, // 'image', 'video', or null
      mediaUrl, // URL to media file or null
      timestamp: new Date().toISOString()
    };
    
    this.messages.set(messageId, message);
    
    const ticketMessages = this.ticketMessages.get(ticketId);
    if (ticketMessages) {
      ticketMessages.push(message);
    }
    
    // Update ticket timestamp
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      ticket.updatedAt = new Date().toISOString();
    }
    
    return message;
  }
  
  getMessagesByTicket(ticketId) {
    return this.ticketMessages.get(ticketId) || [];
  }
  
  // Connection methods
  addConnection(socketId, companyId, ticketId, userType) {
    this.connections.set(socketId, { companyId, ticketId, userType });
  }
  
  getConnection(socketId) {
    return this.connections.get(socketId);
  }
  
  removeConnection(socketId) {
    this.connections.delete(socketId);
  }
  
  getConnectionsByTicket(ticketId) {
    const connections = [];
    for (const [socketId, conn] of this.connections.entries()) {
      if (conn.ticketId === ticketId) {
        connections.push({ socketId, ...conn });
      }
    }
    return connections;
  }
  
  getConnectionsByCompany(companyId) {
    const connections = [];
    for (const [socketId, conn] of this.connections.entries()) {
      if (conn.companyId === companyId) {
        connections.push({ socketId, ...conn });
      }
    }
    return connections;
  }
}

module.exports = new DataStore();
