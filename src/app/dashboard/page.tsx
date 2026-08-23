import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/utils";

export default async function DashboardRedirect() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }
  redirect(dashboardPathForRole(session.user.role));
}
