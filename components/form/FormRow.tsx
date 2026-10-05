import { Label } from "@/components/ui/label";

type Props = { id: string; label: string; help?: string; children: React.ReactNode };

export function FormRow({ id, label, help, children }: Props) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
      {help && <p className="text-muted-foreground text-[11px]">{help}</p>}
    </div>
  );
}
