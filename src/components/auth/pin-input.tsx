"use client";

import { useRef } from "react";

import { Input } from "@/components/ui/input";

type PinInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function PinInput({
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
}: PinInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function handleChange(index: number, digit: string) {
    if (!/^\d?$/.test(digit)) return;
    const next = [...value];
    next[index] = digit;
    onChange(next);

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 3 && next.every((d) => d !== "")) {
      onComplete?.(next.join(""));
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex justify-center gap-3">
      {[0, 1, 2, 3].map((i) => (
        <Input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-12 text-center text-lg"
          autoFocus={autoFocus && i === 0}
        />
      ))}
    </div>
  );
}
