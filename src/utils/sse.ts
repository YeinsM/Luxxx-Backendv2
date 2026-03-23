import { Response } from 'express';

/**
 * In-memory SSE (Server-Sent Events) registry.
 * Maps userId → Set of active Response streams.
 * Used for real-time push of messages and notifications.
 */
class SSEService {
  private clients: Map<string, Set<Response>> = new Map();

  /** Register a new SSE client and set appropriate headers. */
  addClient(userId: string, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders();

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(res);

    // Send initial heartbeat
    res.write('event: connected\ndata: {}\n\n');
  }

  /** Remove a client when they disconnect. */
  removeClient(userId: string, res: Response): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  /** Emit an event to all active connections for a user. */
  emit(userId: string, event: string, data: object): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of userClients) {
      try {
        res.write(payload);
      } catch {
        // Client disconnected mid-write — remove it
        userClients.delete(res);
      }
    }
  }

  /** Send a heartbeat to all connected clients (prevents proxy timeouts). */
  heartbeat(): void {
    for (const [, userClients] of this.clients) {
      for (const res of userClients) {
        try {
          res.write(': heartbeat\n\n');
        } catch {
          userClients.delete(res);
        }
      }
    }
  }

  /** Total number of active SSE connections (for monitoring). */
  get connectionCount(): number {
    let count = 0;
    for (const [, userClients] of this.clients) {
      count += userClients.size;
    }
    return count;
  }
}

// Singleton
export const sseService = new SSEService();

// Send heartbeat every 25 seconds to keep connections alive
setInterval(() => sseService.heartbeat(), 25_000);
