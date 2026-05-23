"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CommandIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  TicketIcon,
  Trash2,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  ticketPriorities,
  ticketSchema,
  ticketStatuses,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/ticket-constants";
import { cn } from "@/lib/utils";

type Ticket = {
  _id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
  assignedPerson: string;
  status: TicketStatus;
  activity: {
    message: string;
    actorName: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

type Counts = {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
};

type TicketResponse = {
  tickets: Ticket[];
  counts: Counts;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
};

type TicketFormValues = z.input<typeof ticketSchema>;

type DashboardProps = {
  user: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
  };
};

const blankTicket: TicketFormValues = {
  title: "",
  description: "",
  priority: "Medium",
  category: "",
  assignedPerson: "",
  status: "Open",
};

const priorityClassName: Record<TicketPriority, string> = {
  Low: "bg-white text-black ring-black/10",
  Medium: "bg-zinc-900 text-white ring-zinc-900",
  High: "bg-black text-white ring-black",
};

const statusClassName: Record<TicketStatus, string> = {
  Open: "bg-white text-black ring-black/10",
  "In Progress": "bg-zinc-900 text-white ring-zinc-900",
  Closed: "bg-black text-white ring-black",
};

function initials(name?: string | null, email?: string | null) {
  const source = name || email || "User";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function uniqueTickets(tickets: Ticket[]) {
  return Array.from(new Map(tickets.map((ticket) => [ticket._id, ticket])).values());
}

function formatRelativeDate(value: string) {
  return `${formatDistanceToNow(new Date(value), { addSuffix: true })}`;
}

function formatExactDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTicketId(value: string) {
  return `#${value.slice(-8).toUpperCase()}`;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export function TicketDashboard({ user }: DashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Counts>({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  });
  const [pageCount, setPageCount] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [priority, setPriority] = useState<TicketPriority | "all">("all");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [deleteTicket, setDeleteTicket] = useState<Ticket | null>(null);
  const [timelineTicket, setTimelineTicket] = useState<Ticket | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: blankTicket,
  });
  const selectedPriority = useWatch({ control, name: "priority" });
  const selectedStatus = useWatch({ control, name: "status" });
  const refreshTickets = useCallback(() => {
    setRefreshIndex((current) => current + 1);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTickets() {
      setLoading(true);
      setErrorTitle(null);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: "8",
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (status !== "all") {
        params.set("status", status);
      }

      if (priority !== "all") {
        params.set("priority", priority);
      }

      try {
        const response = await fetch(`/api/tickets?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as TicketResponse;

        if (!response.ok) {
          setErrorTitle("Tickets could not be loaded");
          setError(payload.message ?? "Please try again in a moment.");
          setTickets([]);
          return;
        }

        setTickets(uniqueTickets(payload.tickets));
        setCounts(payload.counts);
        setPageCount(payload.pagination.pages);
        setResultCount(payload.pagination.total);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Tickets could not be loaded."
        );
        setErrorTitle("Connection issue");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTickets();

    return () => controller.abort();
  }, [debouncedSearch, page, priority, refreshIndex, status]);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTicket(null);
    reset(blankTicket);
  };

  const openCreateDialog = () => {
    setEditingTicket(null);
    reset(blankTicket);
    setDialogOpen(true);
  };

  const openEditDialog = (ticket: Ticket) => {
    setEditingTicket(ticket);
    reset({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category,
      assignedPerson: ticket.assignedPerson,
      status: ticket.status,
    });
    setDialogOpen(true);
  };

  async function submitTicket(values: TicketFormValues) {
    const endpoint = editingTicket
      ? `/api/tickets/${editingTicket._id}`
      : "/api/tickets";
    const response = await fetch(endpoint, {
      method: editingTicket ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = await response.json();

    if (!response.ok) {
      toast.error(payload.message ?? "Ticket could not be saved");
      return;
    }

    toast.success(editingTicket ? "Ticket updated" : "Ticket created");
    closeDialog();
    refreshTickets();
  }

  async function updateTicketStatus(ticket: Ticket, nextStatus: TicketStatus) {
    const previousTickets = tickets;
    setMutatingId(ticket._id);
    setTickets((current) =>
      current.map((item) =>
        item._id === ticket._id ? { ...item, status: nextStatus } : item
      )
    );

    try {
      const response = await fetch(`/api/tickets/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Status could not be changed");
      }

      toast.success("Status changed");
      refreshTickets();
    } catch (statusError) {
      setTickets(previousTickets);
      toast.error(
        statusError instanceof Error
          ? statusError.message
          : "Status could not be changed"
      );
    } finally {
      setMutatingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTicket) {
      return;
    }

    setMutatingId(deleteTicket._id);
    const response = await fetch(`/api/tickets/${deleteTicket._id}`, {
      method: "DELETE",
    });

    setMutatingId(null);

    if (!response.ok) {
      toast.error("Ticket could not be deleted");
      return;
    }

    toast.success("Ticket deleted");
    setDeleteTicket(null);
    refreshTickets();
  }

  const closedPercent = useMemo(() => {
    if (!counts.total) {
      return 0;
    }

    return Math.round((counts.closed / counts.total) * 100);
  }, [counts.closed, counts.total]);

  const initialTableLoading = loading && tickets.length === 0;
  const metricsLoading = initialTableLoading && resultCount === 0 && !error;
  const metricCards = [
    {
      label: "Total Tickets",
      value: counts.total,
      icon: TicketIcon,
      copy: `${resultCount} matching current view`,
    },
    {
      label: "Open Tickets",
      value: counts.open,
      icon: AlertCircle,
      copy: "Needs attention",
    },
    {
      label: "In Progress",
      value: counts.inProgress,
      icon: Clock3,
      copy: "Currently moving",
    },
    {
      label: "Closed Tickets",
      value: counts.closed,
      icon: CheckCircle2,
      copy: `${closedPercent}% resolution rate`,
    },
  ];

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <header className="border-b border-black/10 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
              Support desk
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Ticket Management
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="hidden gap-2 border-black/15 bg-background md:inline-flex"
              onClick={() => setCommandOpen(true)}
            >
              <CommandIcon className="size-4" />
              Quick actions
            </Button>
            <Avatar>
              <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <motion.section
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {metricCards.map((card) => (
            <motion.div
              key={card.label}
              variants={fadeUp}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.25 }}
            >
            <Card className="border-black/10 bg-background shadow-sm shadow-black/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <div className="flex size-9 items-center justify-center rounded-full bg-black text-white">
                  <card.icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <div className="text-3xl font-semibold">{card.value}</div>
                )}
                {metricsLoading ? (
                  <Skeleton className="mt-2 h-4 w-32" />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{card.copy}</p>
                )}
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.section>

        <motion.div variants={fadeUp} initial="initial" animate="animate">
        <Card className="overflow-hidden border-black/10 bg-background shadow-2xl shadow-black/10">
          <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl tracking-tight">Tickets</CardTitle>
              <CardDescription>
                Search, filter, update status, and review every ticket change.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="border-black/15 bg-background"
                onClick={refreshTickets}
                disabled={loading}
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button className="bg-black text-white hover:bg-black/90" onClick={openCreateDialog}>
                <Plus className="size-4" />
                Create ticket
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, description, category, owner..."
                  className="border-black/10 bg-muted/40 pl-9"
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as TicketStatus | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="border-black/10 bg-muted/40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ticketStatuses.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={priority}
                onValueChange={(value) => {
                  setPriority(value as TicketPriority | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="border-black/10 bg-muted/40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {ticketPriorities.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl border border-black/10 bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Resolution progress</p>
                <Badge variant="outline" className="border-black/15 bg-background">
                  {closedPercent}% closed
                </Badge>
              </div>
              <Progress value={closedPercent} />
            </div>

            <AnimatePresence>
            {error ? (
              <motion.div
                className="rounded-2xl border border-black/10 bg-black p-4 text-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {errorTitle ?? "Tickets could not be loaded"}
                    </p>
                    <p className="text-sm text-white/65">{error}</p>
                  </div>
                  <Button variant="secondary" onClick={refreshTickets}>
                    Try again
                  </Button>
                </div>
              </motion.div>
            ) : null}
            </AnimatePresence>

            <div className="overflow-hidden rounded-2xl border border-black/10 bg-background shadow-sm shadow-black/5">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Ticket</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialTableLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-12 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <motion.div
                          className="flex flex-col items-center justify-center py-14 text-center"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-black text-white">
                            <TicketIcon className="size-6" />
                          </div>
                          <p className="font-medium">No tickets found</p>
                          <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            Create a ticket or adjust your search and filters.
                          </p>
                          <Button className="mt-5 bg-black text-white hover:bg-black/90" onClick={openCreateDialog}>
                            <Plus className="size-4" />
                            New ticket
                          </Button>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((ticket, index) => (
                      <motion.tr
                        key={ticket._id}
                        className="border-b transition-colors hover:bg-muted/40"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.035 }}
                      >
                        <TableCell>
                          <button
                            className="text-left transition-opacity hover:opacity-70"
                            onClick={() => setTimelineTicket(ticket)}
                          >
                            <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
                              {formatTicketId(ticket._id)}
                            </p>
                            <p className="font-medium">{ticket.title}</p>
                            <p className="mt-1 line-clamp-1 max-w-lg text-sm text-muted-foreground">
                              {ticket.description}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {ticket.category}
                            </p>
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("border-black/10 ring-1", priorityClassName[ticket.priority])}
                          >
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ticket.status}
                            disabled={mutatingId === ticket._id}
                            onValueChange={(value) =>
                              updateTicketStatus(ticket, value as TicketStatus)
                            }
                          >
                            <SelectTrigger className="w-[150px] border-black/10 bg-muted/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ticketStatuses.map((item) => (
                                <SelectItem key={item} value={item}>
                                  {item}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{ticket.assignedPerson}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatRelativeDate(ticket.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:bg-black hover:text-white">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditDialog(ticket)}>
                                <Pencil className="size-4" />
                                Edit ticket
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setTimelineTicket(ticket)}
                              >
                                <Clock3 className="size-4" />
                                Activity timeline
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTicket(ticket)}
                              >
                                <Trash2 className="size-4" />
                                Delete ticket
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {Math.max(page, 1)} of {pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= pageCount || loading}
                  onClick={() =>
                    setPage((current) => Math.min(current + 1, pageCount))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(open) : closeDialog())}>
        <DialogContent className="border-black/10 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTicket ? "Edit ticket" : "Create ticket"}</DialogTitle>
            <DialogDescription>
              Capture the context, owner, priority, and current workflow state.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit(submitTicket)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register("title")} />
                {errors.title ? (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                ) : null}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={5}
                  {...register("description")}
                />
                {errors.description ? (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={selectedPriority}
                  onValueChange={(value) =>
                    setValue("priority", value as TicketPriority)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketPriorities.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={selectedStatus ?? "Open"}
                  onValueChange={(value) => setValue("status", value as TicketStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketStatuses.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" {...register("category")} />
                {errors.category ? (
                  <p className="text-sm text-destructive">
                    {errors.category.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedPerson">Assigned person</Label>
                <Input id="assignedPerson" {...register("assignedPerson")} />
                {errors.assignedPerson ? (
                  <p className="text-sm text-destructive">
                    {errors.assignedPerson.message}
                  </p>
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {editingTicket ? "Save changes" : "Create ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!timelineTicket} onOpenChange={(open) => !open && setTimelineTicket(null)}>
        <SheetContent className="flex h-dvh w-full flex-col border-black/10 px-7 sm:max-w-lg sm:px-8">
          <SheetHeader className="shrink-0">
            <SheetTitle>{timelineTicket?.title ?? "Activity timeline"}</SheetTitle>
            <SheetDescription>
              Review the full ticket details and saved changes.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto pr-2">
            {timelineTicket ? (
              <div className="space-y-4 rounded-2xl border border-black/10 bg-muted/30 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Ticket ID
                  </p>
                  <p className="mt-1 break-all font-mono text-sm">
                    {timelineTicket._id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Full description
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                    {timelineTicket.description}
                  </p>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Category
                    </p>
                    <p className="mt-1">{timelineTicket.category}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Assigned
                    </p>
                    <p className="mt-1">{timelineTicket.assignedPerson}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Priority
                    </p>
                    <p className="mt-1">{timelineTicket.priority}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <p className="mt-1">{timelineTicket.status}</p>
                  </div>
                </div>
              </div>
            ) : null}
            <div>
              <h3 className="text-sm font-medium">Activity timeline</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Every saved change is kept with a timestamp.
              </p>
            </div>
            {timelineTicket?.activity.map((entry, index) => (
              <div key={`${entry.createdAt}-${index}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="size-3 rounded-full bg-black" />
                  {index < timelineTicket.activity.length - 1 ? (
                    <div className="mt-2 h-full w-px bg-border" />
                  ) : null}
                </div>
                <div className="pb-5">
                  <p className="font-medium">{entry.message}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {entry.actorName} · {formatExactDateTime(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {!timelineTicket?.activity.length ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTicket} onOpenChange={(open) => !open && setDeleteTicket(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTicket?.title} from your dashboard. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {mutatingId === deleteTicket?._id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <Command>
          <CommandInput placeholder="Search tickets or actions..." />
          <CommandList>
            <CommandEmpty>No matching tickets.</CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false);
                  openCreateDialog();
                }}
              >
                <Plus className="size-4" />
                Create ticket
                <CommandShortcut>N</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false);
                  refreshTickets();
                }}
              >
                <RefreshCw className="size-4" />
                Refresh tickets
                <CommandShortcut>R</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <Separator />
            <CommandGroup heading="Tickets">
              {tickets.map((ticket) => (
                <CommandItem
                  key={ticket._id}
                  onSelect={() => {
                    setCommandOpen(false);
                    setTimelineTicket(ticket);
                  }}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      statusClassName[ticket.status]
                    )}
                  />
                  {ticket.title}
                  <CommandShortcut>{ticket.priority}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </motion.div>
  );
}
