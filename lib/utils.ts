import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskName(name: string | null): string {
  if (!name) return "익명";
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "*";
  const starCount = Math.min(name.length - 2, 3);
  return name[0] + "*".repeat(starCount) + name[name.length - 1];
}

export function maskEmail(email: string | null): string {
  if (!email || !email.includes("@")) return "unknown@***.com";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return local + "***@" + domain;
  return local.slice(0, 3) + "***@" + domain;
}
