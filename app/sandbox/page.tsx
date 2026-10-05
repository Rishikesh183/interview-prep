import type { Metadata } from "next";
import { SandboxClient } from "./SandboxClient";

export const metadata: Metadata = { title: "Sandbox · SysDesign Arena" };

export default function SandboxPage() {
  return <SandboxClient />;
}
