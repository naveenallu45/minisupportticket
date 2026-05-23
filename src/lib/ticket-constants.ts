import { z } from "zod";

export const ticketPriorities = ["Low", "Medium", "High"] as const;
export const ticketStatuses = ["Open", "In Progress", "Closed"] as const;
const ticketDisplayFields = ["title", "description", "category"] as const;

export type TicketPriority = (typeof ticketPriorities)[number];
export type TicketStatus = (typeof ticketStatuses)[number];

export function capitalizeFirstLetter(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export function normalizeTicketDisplayFields<T extends Record<string, unknown>>(
  values: T
) {
  const normalized = { ...values };

  for (const field of ticketDisplayFields) {
    const value = normalized[field];

    if (typeof value === "string") {
      normalized[field] = capitalizeFirstLetter(value);
    }
  }

  return normalized;
}

export const ticketSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000),
  priority: z.enum(ticketPriorities),
  category: z.string().trim().min(2, "Category is required").max(80),
  assignedPerson: z
    .string()
    .trim()
    .min(2, "Assigned person is required")
    .max(80),
  status: z.enum(ticketStatuses).default("Open"),
});

export const ticketUpdateSchema = ticketSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one ticket field is required"
);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});
