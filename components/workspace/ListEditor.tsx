"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  id: string;
  label: string;
  help: string;
  placeholder: string;
  value: string[];
  onChange: (lines: string[]) => void;
};

const toLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);

/**
 * One item per line — fast to type during an interview. Keeps its own text so blank lines and
 * trailing newlines survive while typing; the store only gets the cleaned list.
 */
export function ListEditor({ id, label, help, placeholder, value, onChange }: Props) {
  const [text, setText] = useState(() => value.join("\n"));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-muted-foreground text-xs tabular-nums">{value.length}</span>
      </div>
      <p className="text-muted-foreground text-xs">{help}</p>
      <Textarea
        id={id}
        rows={5}
        className="font-mono text-xs leading-relaxed"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(toLines(e.target.value));
        }}
      />
    </div>
  );
}
