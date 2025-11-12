/**
 * In-memory data store for the live chat application
 * Stores companies, tickets, messages, and connections
 */

export interface Company {
  id: string;
  name: string;
  apiKey: string;
}

export interface Ticket {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  ticketId: string;
  sender: string;
  senderType: 'customer' | 'agent';
  content: string;
  mediaType: 'image' | 'video' | null;
  mediaUrl: string | null;
  timestamp: string;
}

export interface Connection {
  companyId: string;
  ticketId: string;
  userType: 'customer' | 'agent';
}

class DataStore {
  private companies: Map<string, Company>;
  private tickets: Map<string, Ticket>;
  private messages: Map<string, Message>;
  private connections: Map<string, Connection>;
  private ticketMessages: Map<string, Message[]>;
  private companyTickets: Map<string, Set<string>>;

  constructor() {
    this.companies = new Map();
    this.tickets = new Map();
    this.messages = new Map();
    this.connections = new Map();
    this.ticketMessages = new Map();
    this.companyTickets = new Map();
    
    this._initializeSampleData();
  }
  
  private _initializeSampleData(): void {
    // Create sample companies
    this.createCompany('company-1', 'Empresa 1', 'api-key-company-1');
    this.createCompany('company-2', 'Empresa 2', 'api-key-company-2');
  }
  
  // Company methods
  createCompany(id: string, name: string, apiKey: string): Company {
    const company: Company = { id, name, apiKey };
    this.companies.set(id, company);
    this.companyTickets.set(id, new Set());
    return company;
  }
  
  getCompany(companyId: string): Company | undefined {
    return this.companies.get(companyId);
  }
  
  getCompanyByApiKey(apiKey: string): Company | null {
    for (const company of this.companies.values()) {
      if (company.apiKey === apiKey) {
        return company;
      }
    }
    return null;
  }
  
  getAllCompanies(): Company[] {
    return Array.from(this.companies.values());
  }
  
  // Ticket methods
  createTicket(companyId: string, customerId: string, customerName: string): Ticket {
    const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ticket: Ticket = {
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
  
  getTicket(ticketId: string): Ticket | undefined {
    return this.tickets.get(ticketId);
  }
  
  getTicketsByCompany(companyId: string): Ticket[] {
    const ticketIds = this.companyTickets.get(companyId);
    if (!ticketIds) return [];
    
    return Array.from(ticketIds)
      .map(id => this.tickets.get(id))
      .filter((ticket): ticket is Ticket => ticket !== undefined)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  
  updateTicketStatus(ticketId: string, status: 'open' | 'closed'): Ticket | null {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
      return ticket;
    }
    return null;
  }
  
  // Message methods
  createMessage(
    ticketId: string,
    sender: string,
    senderType: 'customer' | 'agent',
    content: string,
    mediaType: 'image' | 'video' | null = null,
    mediaUrl: string | null = null
  ): Message {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message: Message = {
      id: messageId,
      ticketId,
      sender,
      senderType,
      content,
      mediaType,
      mediaUrl,
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
  
  getMessagesByTicket(ticketId: string): Message[] {
    return this.ticketMessages.get(ticketId) || [];
  }
  
  // Connection methods
  addConnection(socketId: string, companyId: string, ticketId: string, userType: 'customer' | 'agent'): void {
    this.connections.set(socketId, { companyId, ticketId, userType });
  }
  
  getConnection(socketId: string): Connection | undefined {
    return this.connections.get(socketId);
  }
  
  removeConnection(socketId: string): void {
    this.connections.delete(socketId);
  }
  
  getConnectionsByTicket(ticketId: string): Array<{ socketId: string } & Connection> {
    const connections: Array<{ socketId: string } & Connection> = [];
    for (const [socketId, conn] of this.connections.entries()) {
      if (conn.ticketId === ticketId) {
        connections.push({ socketId, ...conn });
      }
    }
    return connections;
  }
  
  getConnectionsByCompany(companyId: string): Array<{ socketId: string } & Connection> {
    const connections: Array<{ socketId: string } & Connection> = [];
    for (const [socketId, conn] of this.connections.entries()) {
      if (conn.companyId === companyId) {
        connections.push({ socketId, ...conn });
      }
    }
    return connections;
  }
}

export default new DataStore();
