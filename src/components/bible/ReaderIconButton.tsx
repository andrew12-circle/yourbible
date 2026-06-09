import { forwardRef, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { readerIconButton, readerIconButtonActive } from "@/lib/bible/readerChromeClasses";

interface Props {
  title: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  ariaPressed?: boolean;
  asChild?: boolean;
  children: ReactNode;
  className?: string;
}

export const ReaderIconButton = forwardRef<HTMLButtonElement, Props>(function ReaderIconButton(
  {
    title,
    onClick,
    active = false,
    disabled = false,
    ariaPressed,
    asChild = false,
    children,
    className,
  },
  ref,
) {
  const Comp = asChild ? Slot : Button;

  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : "button"}
      variant={asChild ? undefined : "ghost"}
      size={asChild ? undefined : "icon"}
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-pressed={ariaPressed}
      className={cn(readerIconButton, active && readerIconButtonActive, className)}
    >
      {children}
    </Comp>
  );
});
