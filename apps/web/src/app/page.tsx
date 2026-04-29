import { redirect } from "next/navigation";

import { AuthPage } from "@/components/auth-page";
import { isAuthenticated } from "@/lib/auth-server";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  if (params?.email || params?.password) {
    redirect("/");
  }

  if (await isAuthenticated()) {
    redirect("/pipeline");
  }

  return <AuthPage />;
}
