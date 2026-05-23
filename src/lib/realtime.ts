import type { Server } from "socket.io";

export type TicketRealtimeEvent =
  | "ticket:created"
  | "ticket:updated"
  | "ticket:deleted";

export type TicketRealtimePayload = {
  ticketId: string;
  actorId: string;
  message: string;
  at: string;
};

declare global {
  var ticketSocketServer: Server | undefined;
}

export function emitTicketEvent(
  event: TicketRealtimeEvent,
  payload: TicketRealtimePayload
) {
  globalThis.ticketSocketServer?.emit(event, payload);
}
