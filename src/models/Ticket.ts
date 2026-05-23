import { model, models, Schema, type Model, type Types } from "mongoose";
import {
  ticketPriorities,
  ticketStatuses,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/ticket-constants";

export type TicketActivity = {
  message: string;
  actorName: string;
  createdAt: Date;
};

export type TicketDocument = {
  _id: Types.ObjectId;
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
  assignedPerson: string;
  status: TicketStatus;
  creator: Types.ObjectId;
  activity: TicketActivity[];
  createdAt: Date;
  updatedAt: Date;
};

const ticketActivitySchema = new Schema<TicketActivity>(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ticketSchema = new Schema<TicketDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    priority: {
      type: String,
      enum: ticketPriorities,
      default: "Medium",
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    assignedPerson: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    status: {
      type: String,
      enum: ticketStatuses,
      default: "Open",
      required: true,
      index: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activity: {
      type: [ticketActivitySchema],
      default: [],
    },
  },
  { timestamps: true }
);

ticketSchema.index({
  title: "text",
  description: "text",
  category: "text",
  assignedPerson: "text",
});

const Ticket =
  (models.Ticket as Model<TicketDocument> | undefined) ??
  model<TicketDocument>("Ticket", ticketSchema);

export default Ticket;
