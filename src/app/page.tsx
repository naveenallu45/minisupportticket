import { redirect } from "next/navigation";
import { getCurrentSession } from "@/auth";

export default async function Home() {
  const session = await getCurrentSession();

  redirect(session ? "/dashboard" : "/login");
}
