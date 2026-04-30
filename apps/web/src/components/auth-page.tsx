"use client";

import { Button } from "@CRM-APP/ui/components/button";

import { authClient } from "@/lib/auth-client";

export function AuthPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-md p-6 flex flex-col items-center gap-8">
        <h1 className="text-3xl font-bold">Bienvenue sur le CRM</h1>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() =>
            authClient.signIn.social({
              provider: "microsoft",
              callbackURL: "/pipeline",
            })
          }
        >
          <img src="/microsoft-color.svg" alt="Microsoft" className="size-4" />
          Se connecter avec Microsoft
        </Button>
      </div>
    </main>
  );
}
