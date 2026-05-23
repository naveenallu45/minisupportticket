import type { TicketDocument } from "@/models/Ticket";
import { capitalizeFirstLetter } from "@/lib/ticket-constants";

type LeanTicket = Omit<TicketDocument, "creator"> & {
  _id: { toString(): string };
  creator?: { toString(): string };
};

export type SerializedTicket = {
  _id: string;
  title: string;
  description: string;
  priority: TicketDocument["priority"];
  category: string;
  assignedPerson: string;
  status: TicketDocument["status"];
  activity: {
    message: string;
    actorName: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export function serializeTicket(ticket: LeanTicket): SerializedTicket {
  return {
    _id: ticket._id.toString(),
    title: capitalizeFirstLetter(ticket.title),
    description: capitalizeFirstLetter(ticket.description),
    priority: ticket.priority,
    category: capitalizeFirstLetter(ticket.category),
    assignedPerson: ticket.assignedPerson,
    status: ticket.status,
    activity: ticket.activity.map((entry) => ({
      message: entry.message,
      actorName: entry.actorName,
      createdAt: new Date(entry.createdAt).toISOString(),
    })),
    createdAt: new Date(ticket.createdAt).toISOString(),
    updatedAt: new Date(ticket.updatedAt).toISOString(),
  };
}
