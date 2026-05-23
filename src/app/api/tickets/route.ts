import { Types } from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import {
  normalizeTicketDisplayFields,
  ticketPriorities,
  ticketSchema,
  ticketStatuses,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/ticket-constants";
import { serializeTicket } from "@/lib/ticket-serializers";
import Ticket from "@/models/Ticket";

export const runtime = "nodejs";

type TicketQuery = {
  creator: Types.ObjectId;
  status?: TicketStatus;
  priority?: TicketPriority;
  $or?: { [key: string]: RegExp }[];
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = new Types.ObjectId(session.user.id);
    const page = Math.max(
      Number(request.nextUrl.searchParams.get("page") ?? "1"),
      1
    );
    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "8"), 1),
      20
    );
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const status = request.nextUrl.searchParams.get("status");
    const priority = request.nextUrl.searchParams.get("priority");

    const query: TicketQuery = { creator: userId };

    if (ticketStatuses.includes(status as TicketStatus)) {
      query.status = status as TicketStatus;
    }

    if (ticketPriorities.includes(priority as TicketPriority)) {
      query.priority = priority as TicketPriority;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { assignedPerson: regex },
      ];
    }

    const countBase = { creator: userId };
    const [tickets, totalFiltered, total, open, inProgress, closed] =
      await Promise.all([
        Ticket.find(query)
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Ticket.countDocuments(query),
        Ticket.countDocuments(countBase),
        Ticket.countDocuments({ ...countBase, status: "Open" }),
        Ticket.countDocuments({ ...countBase, status: "In Progress" }),
        Ticket.countDocuments({ ...countBase, status: "Closed" }),
      ]);

    return NextResponse.json({
      tickets: tickets.map(serializeTicket),
      counts: {
        total,
        open,
        inProgress,
        closed,
      },
      pagination: {
        page,
        limit,
        total: totalFiltered,
        pages: Math.max(Math.ceil(totalFiltered / limit), 1),
      },
    });
  } catch (error) {
    console.error("Tickets fetch failed", error);

    return NextResponse.json(
      { message: "Tickets could not be loaded." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ticketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please check the ticket details.", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const ticket = await Ticket.create({
      ...normalizeTicketDisplayFields(parsed.data),
      creator: new Types.ObjectId(session.user.id),
      activity: [
        {
          message: "Ticket created",
          actorName: session.user.name ?? "Support user",
          createdAt: new Date(),
        },
      ],
    });
    const serializedTicket = serializeTicket(ticket.toObject());

    return NextResponse.json(
      { ticket: serializedTicket },
      { status: 201 }
    );
  } catch (error) {
    console.error("Ticket creation failed", error);

    return NextResponse.json(
      { message: "Ticket could not be created." },
      { status: 500 }
    );
  }
}
