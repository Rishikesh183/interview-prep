"use client";

import type { Requirements as Reqs } from "@/lib/schema";
import { useAttemptStore } from "@/store/attempt";
import { ListEditor } from "../ListEditor";
import { StageIntro } from "./StageIntro";

const SECTIONS: { key: keyof Reqs; label: string; help: string; placeholder: string }[] = [
  {
    key: "questions",
    label: "Clarifying questions",
    help: "What would you ask the interviewer before designing?",
    placeholder: "Do links expire?\nCustom aliases?\nAnalytics needed?",
  },
  {
    key: "functional",
    label: "Functional requirements",
    help: "What the system must do. One per line.",
    placeholder: "Create a short URL\nRedirect to the long URL",
  },
  {
    key: "nonFunctional",
    label: "Non-functional requirements",
    help: "Availability, latency, consistency, durability, scale.",
    placeholder: "Highly available\np99 redirect < 50 ms",
  },
  {
    key: "outOfScope",
    label: "Out of scope",
    help: "What you are deliberately not designing.",
    placeholder: "Analytics dashboard",
  },
];

export function Requirements() {
  const requirements = useAttemptStore((s) => s.meta?.requirements);
  const setRequirements = useAttemptStore((s) => s.setRequirements);
  if (!requirements) return null;

  return (
    <div className="space-y-6">
      <StageIntro
        title="Requirements"
        text="Scope the problem first. Reference requirements are revealed after you submit, so you can compare."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <ListEditor
            key={s.key}
            id={`req-${s.key}`}
            label={s.label}
            help={s.help}
            placeholder={s.placeholder}
            value={requirements[s.key]}
            onChange={(lines) => setRequirements(s.key, lines)}
          />
        ))}
      </div>
    </div>
  );
}
