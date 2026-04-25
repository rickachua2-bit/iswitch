import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type BookingField = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
};

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary: string;
  fields: BookingField[];
  onSubmit: (values: Record<string, string>) => Promise<{ reference?: string; status?: string }>;
}

export function BookingDialog({ open, onOpenChange, title, summary, fields, onSubmit }: BookingDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await onSubmit(values);
      toast.success(`Booking ${result.status ?? "submitted"}`, {
        description: result.reference ? `Reference: ${result.reference}` : "We'll email your confirmation shortly.",
      });
      onOpenChange(false);
      setValues({});
    } catch (err: any) {
      toast.error("Booking failed", { description: err?.message ?? "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1">
              <Label htmlFor={f.name}>{f.label}{f.required && " *"}</Label>
              <Input
                id={f.name}
                type={f.type ?? "text"}
                required={f.required}
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Booking…" : "Confirm booking"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
