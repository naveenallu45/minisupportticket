import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import {
  normalizeTicketDisplayFields,
  ticketUpdateSchema,
} from "@/lib/ticket-constants";
import { serializeTicket } from "@/lib/ticket-serializers";
import Ticket from "@/models/Ticket";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function buildActivityMessages(
  previous: Awaited<ReturnType<typeof Ticket.findOne>>,
  updates: Record<string, unknown>
) {
  const messages: string[] = [];

  if (!previous) {
    return messages;
  }

  if (updates.status && updates.status !== previous.status) {
    messages.push(`Status changed from ${previous.status} to ${updates.status}`);
  }

  const editedFields = ["title", "description", "priority", "category", "assignedPerson"].filter(
    (field) => updates[field] !== undefined && updates[field] !== previous.get(field)
  );

  if (editedFields.length > 0) {
    messages.push("Ticket details updated");
  }

  return messages;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getCurrentSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = ticketUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Please check the ticket details.", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const ticket = await Ticket.findOne({
      _id: id,
      creator: new Types.ObjectId(session.user.id),
    });

    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
    }

    const updates = normalizeTicketDisplayFields(parsed.data);
    const activityMessages = buildActivityMessages(ticket, updates);

    Object.assign(ticket, updates);

    for (const message of activityMessages) {
      ticket.activity.push({
        message,
        actorName: session.user.name ?? "Support user",
        createdAt: new Date(),
      });
    }

    await ticket.save();
    const serializedTicket = serializeTicket(ticket.toObject());

    return NextResponse.json({ ticket: serializedTicket });
  } catch (error) {
    console.error("Ticket update failed", error);

    return NextResponse.json(
      { message: "Ticket could not be updated." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getCurrentSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
    }

    await connectToDatabase();

    const deletedTicket = await Ticket.findOneAndDelete({
      _id: id,
      creator: new Types.ObjectId(session.user.id),
    });

    if (!deletedTicket) {
      return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Ticket deleted." });
  } catch (error) {
    console.error("Ticket delete failed", error);

    return NextResponse.json(
      { message: "Ticket could not be deleted." },
      { status: 500 }
    );
  }
}
