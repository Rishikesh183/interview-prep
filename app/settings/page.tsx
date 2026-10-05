import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings · SysDesign Arena" };

export default function SettingsPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <SettingsView />
      </main>
    </>
  );
}
