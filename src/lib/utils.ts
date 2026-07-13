import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) =>
      word.length === 0
        ? word
        : word[0].toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

export function toSentenceCase(value: string): string {
  return value
    .split(/([.!?]\s+)/)
    .map((segment, index) =>
      index % 2 === 1 || segment.length === 0
        ? segment
        : segment[0].toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join("");
}
