import { redirect } from "next/navigation";
import { getCurrentSession } from "@/auth";
import { TicketDashboard } from "@/components/ticket-dashboard";

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <TicketDashboard user={session.user} />;
}
