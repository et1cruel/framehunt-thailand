import { useLanguage } from "@/i18n/Language";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Button ─────────────────────────────────────────────────────────────── */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl whitespace-nowrap text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acid",
  {
    variants: {
      variant: {
        primary: "border border-transparent bg-acid text-ink shadow-clay hover:bg-paper",
        ink: "border border-white/80 bg-ink text-paper shadow-clay hover:bg-ink-2",
        outline: "border border-paper/25 bg-ink/70 text-paper hover:border-acid hover:text-acid",
        outlineInk: "border border-ink/30 text-ink hover:border-ink hover:bg-ink hover:text-paper",
        ghost: "text-paper hover:bg-ink/75 hover:text-acid",
        burnt: "bg-burnt text-ink hover:bg-paper",
        paper: "bg-paper text-ink hover:bg-acid",
      },
      size: {
        sm: "min-h-9 px-3 text-xs",
        md: "min-h-11 px-4",
        lg: "min-h-12 px-5",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

/* ── Badge ──────────────────────────────────────────────────────────────── */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-xs font-medium leading-tight",
  {
    variants: {
      variant: {
        default: "border-paper/25 text-paper/75",
        acid: "border-acid/60 bg-acid/10 text-acid",
        burnt: "border-burnt/60 bg-burnt/10 text-burnt",
        ink: "border-ink/20 bg-ink/5 text-ink/70",
        solid: "border-acid bg-acid text-ink",
        outline: "border-paper/20 text-concrete",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* ── Inputs ─────────────────────────────────────────────────────────────── */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-paper/25 bg-ink/85 px-4 font-sans text-sm text-paper placeholder:text-concrete focus:border-acid focus:ring-2 focus:ring-acid/30 focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-xl border border-paper/25 bg-ink/85 px-4 py-3 font-sans text-sm text-paper placeholder:text-concrete focus:border-acid focus:ring-2 focus:ring-acid/30 focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-paper/25 bg-ink px-4 font-sans text-sm text-paper focus:border-acid focus:ring-2 focus:ring-acid/30 focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("label-mono mb-2 block text-concrete", className)} {...props} />;
}

/* ── Switch ─────────────────────────────────────────────────────────────── */
export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-sans text-sm text-paper/80">{label}</span>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-6 w-11 shrink-0 rounded-full border border-paper/30 bg-ink-2 data-[state=checked]:border-acid data-[state=checked]:bg-acid"
      >
        <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-1 rounded-full bg-paper transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-ink" />
      </SwitchPrimitive.Root>
    </div>
  );
}

/* ── Dialog ─────────────────────────────────────────────────────────────── */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({
  className,
  children,
  hideClose = false,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  const { t } = useLanguage();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-paper/25 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto glass-panel p-6 md:p-8",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-paper/20 bg-ink text-concrete hover:border-acid hover:text-acid"
            aria-label={t("ปิด")}
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */
export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex flex-wrap gap-1 rounded-2xl border border-white/85 bg-ink-2/90 p-1 shadow-clay", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium text-concrete transition-colors data-[state=active]:bg-acid data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-6", className)} {...props} />;
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-paper/10", className)} />;
}

/* ── Status pill ────────────────────────────────────────────────────────── */
const PERMISSION_LABELS: Record<string, { th: string; cls: string }> = {
  allowed: { th: "อนุญาตแล้ว", cls: "border-acid/60 text-acid" },
  needs_permission: { th: "ต้องขออนุญาต", cls: "border-burnt/70 text-burnt" },
  unknown: { th: "ยังไม่ยืนยัน", cls: "border-paper/25 text-concrete" },
  restricted: { th: "ไม่อนุญาต", cls: "border-burnt/60 text-burnt" },
};

export function PermissionPill({ status, className }: { status: string; className?: string }) {
  const { t } = useLanguage();
  const meta = PERMISSION_LABELS[status] ?? PERMISSION_LABELS.unknown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        meta.cls,
        className,
      )}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {t(meta.th)}
    </span>
  );
}
