import { redirect } from "next/navigation";

import { AuthPage } from "@/components/auth-page";
import { isAuthenticated } from "@/lib/auth-server";

export default async function Home() {
  if (await isAuthenticated()) {
    redirect("/pipeline");
  }

  return <AuthPage />;
}
