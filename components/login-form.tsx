"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { signIn } from "@/app/actions/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await signIn(email, password);
          } catch (err) {
            if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
            setError(err instanceof Error ? err.message : "Could not sign in.");
          }
        });
      }}
      className="w-full max-w-sm space-y-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div>
        <h1 className="font-serif text-lg font-semibold text-textPrimary">Admin sign in</h1>
        <p className="mt-1 text-xs text-textMuted">Sign in to manage products, categories, brands, and tags.</p>
      </div>

      {error && <p className="rounded-lg bg-dangerSoft px-3 py-2 text-xs text-danger">{error}</p>}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
