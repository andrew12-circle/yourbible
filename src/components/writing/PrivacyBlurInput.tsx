import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mergeFieldRefs, privacyBlurMirrorClass, usePrivacyBlurField } from "@/hooks/usePrivacyBlurField";
import { PrivacyBlurOverlay } from "@/components/writing/PrivacyBlurOverlay";

export type PrivacyBlurInputProps = Omit<InputProps, "value" | "onChange"> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const PrivacyBlurInput = React.forwardRef<HTMLInputElement, PrivacyBlurInputProps>(
  ({ value, onChange, className, onSelect, onKeyUp, onClick, onFocus, ...rest }, ref) => {
    const {
      privacyBlurEnabled,
      fieldClassName,
      bindPrivacyBlurHandlers,
      setCombinedRef,
      overlayProps,
    } = usePrivacyBlurField({
      value,
      mirrorClassName: privacyBlurMirrorClass(className),
    });

    const privacyHandlers = bindPrivacyBlurHandlers({ onChange, onSelect, onKeyUp, onClick, onFocus });

    return (
      <div className="relative">
        {overlayProps ? <PrivacyBlurOverlay {...overlayProps} /> : null}
        <Input
          {...rest}
          {...privacyHandlers}
          ref={mergeFieldRefs(setCombinedRef, ref)}
          value={value}
          className={cn(className, fieldClassName, privacyBlurEnabled && "relative z-[1] bg-transparent")}
        />
      </div>
    );
  },
);
PrivacyBlurInput.displayName = "PrivacyBlurInput";
