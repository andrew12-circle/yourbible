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
  if (asChild) {
    return (
      <Slot
        ref={ref}
        onClick={onClick}
        title={title}
        aria-label={rest["aria-label"] ?? title}
        aria-pressed={ariaPressed}
        className={cn(readerIconButton, active && readerIconButtonActive, className)}
        {...rest}
      >
        {children}
      </Slot>
    );
  }

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      title={title}
      aria-label={rest["aria-label"] ?? title}
      disabled={disabled}
      aria-pressed={ariaPressed}
      className={cn(readerIconButton, active && readerIconButtonActive, className)}
      {...rest}
    >
      {children}
    </Button>
  );
});
