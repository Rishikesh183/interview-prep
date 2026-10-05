import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in · SysDesign Arena" };

export default function LoginPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-sm space-y-6 px-4 py-16">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-muted-foreground text-sm">
            Sync your attempts across devices. Everything still works offline; it syncs when you are
            back online.
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}
