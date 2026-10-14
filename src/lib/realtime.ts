import { PublicDoctorAvailability } from '@/lib/types';

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
}

class AvailabilityBroadcaster {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.sendComment('ping');
    }, 15000);
  }

  public addClient(id: string, controller: ReadableStreamDefaultController) {
    this.clients.set(id, { id, controller });
    // Send welcome initial confirmation
    const encoder = new TextEncoder();
    try {
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`));
    } catch {
      this.removeClient(id);
    }
  }

  public removeClient(id: string) {
    this.clients.delete(id);
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  private sendComment(comment: string) {
    const encoder = new TextEncoder();
    const deadClientIds: string[] = [];

    for (const [id, client] of this.clients.entries()) {
      try {
        client.controller.enqueue(encoder.encode(`: ${comment}\n\n`));
      } catch {
        deadClientIds.push(id);
      }
    }

    for (const id of deadClientIds) {
      this.removeClient(id);
    }
  }

  public broadcastAvailabilityUpdate(data: PublicDoctorAvailability) {
    const encoder = new TextEncoder();
    const payload = `event: availability_update\ndata: ${JSON.stringify(data)}\n\n`;
    const deadClientIds: string[] = [];

    for (const [id, client] of this.clients.entries()) {
      try {
        client.controller.enqueue(encoder.encode(payload));
      } catch {
        deadClientIds.push(id);
      }
    }

    for (const id of deadClientIds) {
      this.removeClient(id);
    }
  }
}

// Global singleton to persist across Next.js dev server hot-reloads
const globalForRealtime = globalThis as unknown as {
  availabilityBroadcaster: AvailabilityBroadcaster | undefined;
};

export const availabilityBroadcaster =
  globalForRealtime.availabilityBroadcaster ?? new AvailabilityBroadcaster();

if (process.env.NODE_ENV !== 'production') {
  globalForRealtime.availabilityBroadcaster = availabilityBroadcaster;
}
