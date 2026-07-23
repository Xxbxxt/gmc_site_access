"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import type * as React from "react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
};

export function Combobox({
  value,
  onChange,
  options,
  disabled,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  id,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ref,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={(node) => {
            triggerRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          id={id}
          aria-describedby={ariaDescribedby}
          aria-invalid={ariaInvalid}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDownIcon className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0"
        style={{ width: triggerRef.current?.offsetWidth }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(selected) => {
                    onChange(selected === value ? "" : selected);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      value === option ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
