import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { readerIconButton, readerIconButtonActive } from "@/lib/bible/readerChromeClasses";

type Props = Omit<ComponentPropsWithoutRef<typeof Button>, "title" | "children"> & {
  title: string;
  active?: boolean;
  ariaPressed?: boolean;
  asChild?: boolean;
  children: ReactNode;
};

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
    ...rest
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
      aria-label={rest["aria-label"] ?? title}
      disabled={disabled}
      aria-pressed={ariaPressed}
      className={cn(readerIconButton, active && readerIconButtonActive, className)}
      {...rest}
    >
      {children}
    </Comp>
  );
});
