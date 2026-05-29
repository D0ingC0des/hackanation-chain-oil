import { Mail, Phone, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PixType = "PHONE" | "CPF" | "EMAIL";

export const PIX_OPTIONS: { type: PixType; label: string; placeholder: string }[] = [
  { type: "PHONE", label: "Celular", placeholder: "(11) 90000-0000" },
  { type: "CPF", label: "CPF", placeholder: "000.000.000-00" },
  { type: "EMAIL", label: "E-mail", placeholder: "cidadao@email.com" },
];

export const PIX_LABELS: Record<PixType, string> = {
  PHONE: "Celular do cidadão",
  CPF: "CPF do cidadão",
  EMAIL: "E-mail do cidadão",
};

export const PIX_ICON: Record<PixType, LucideIcon> = {
  PHONE: Phone,
  CPF: User,
  EMAIL: Mail,
};
