"use client";

import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      {mode === "sign-in" ? (
        <SignInForm onSwitchToSignUp={() => setMode("sign-up")} />
      ) : (
        <SignUpForm onSwitchToSignIn={() => setMode("sign-in")} />
      )}
    </main>
  );
}
