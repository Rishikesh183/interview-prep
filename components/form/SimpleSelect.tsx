"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Radix Select can't hold an empty string, so "unset" uses a sentinel value. */
const NONE = "__none__";

type Option = string | { value: string; label: string };

type Props = {
  id?: string;
  value: string | undefined;
  options: readonly Option[];
  onChange: (value: string | undefined) => void;
  /** Adds a "—" choice that clears the value. */
  allowNone?: boolean;
  placeholder?: string;
};

export function SimpleSelect({ id, value, options, onChange, allowNone, placeholder }: Props) {
  return (
    <Select
      // Unset shows the placeholder if there is one ("" keeps Radix controlled), otherwise "—".
      value={value ?? (allowNone && !placeholder ? NONE : "")}
      onValueChange={(v) => onChange(v === NONE ? undefined : v)}
    >
      <SelectTrigger id={id} size="sm" className="w-full">
        <SelectValue placeholder={placeholder ?? "Select..."} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE}>—</SelectItem>}
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
