import { NextRequest } from 'next/server';
import { availabilityBroadcaster } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const clientId = Math.random().toString(36).substring(2, 11);

  const stream = new ReadableStream({
    start(controller) {
      availabilityBroadcaster.addClient(clientId, controller);
    },
    cancel() {
      availabilityBroadcaster.removeClient(clientId);
    },
  });

  // Handle client disconnection / abort
  req.signal.addEventListener('abort', () => {
    availabilityBroadcaster.removeClient(clientId);
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // For proxy buffering disable
    },
  });
}
