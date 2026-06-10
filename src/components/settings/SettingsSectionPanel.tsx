import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsSectionPanel({ title, description, children, className }: Props) {
  return (
    <section className={cn("space-y-4", className)}>
      <header>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

type SettingsCardProps = {
  children: ReactNode;
  className?: string;
};

export function SettingsCard({ children, className }: SettingsCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 md:p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}
