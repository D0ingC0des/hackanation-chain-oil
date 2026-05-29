import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { formatPhone, formatCPF } from "@/utils/formatters";
import { calcWater, calcCO2, CAR_DAYS_PER_LITER } from "@/constants/impact";
import { PENDING_PHOTO_KEY } from "@/constants/session";
import type { PixType } from "@/constants/pix";
import { useRate } from "@/hooks/use-rate";

export function useCollect() {
  const navigate = useNavigate();
  const { rate } = useRate();

  const [pixType, setPixTypeState] = useState<PixType>("PHONE");
  const [pixKey, setPixKey] = useState("");
  const [liters, setLiters] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);

  const reward = useMemo(() => (liters * rate).toFixed(2).replace(".", ","), [liters, rate]);
  const water = calcWater(liters);
  const co2 = calcCO2(liters).toFixed(1);
  const carDays = liters * CAR_DAYS_PER_LITER;

  function setPixType(type: PixType) {
    setPixTypeState(type);
    setPixKey("");
  }

  function handlePixKeyChange(raw: string) {
    if (pixType === "PHONE") setPixKey(formatPhone(raw));
    else if (pixType === "CPF") setPixKey(formatCPF(raw));
    else setPixKey(raw);
  }

  const canSubmit = useMemo(() => {
    if (liters <= 0) return false;
    if (pixType === "PHONE") return pixKey.replace(/\D/g, "").length >= 10;
    if (pixType === "CPF") return pixKey.replace(/\D/g, "").length === 11;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey);
  }, [pixKey, pixType, liters]);

  function handleConfirm() {
    if (photo) {
      sessionStorage.setItem(PENDING_PHOTO_KEY, photo);
    } else {
      sessionStorage.removeItem(PENDING_PHOTO_KEY);
    }
    navigate({
      to: "/processing",
      search: { l: liters, p: pixKey, t: pixType } as { l: number; p: string; t: PixType },
    });
  }

  return {
    pixType,
    setPixType,
    pixKey,
    setPixKey,
    liters,
    setLiters,
    photo,
    setPhoto,
    reward,
    water,
    co2,
    carDays,
    canSubmit,
    handlePixKeyChange,
    handleConfirm,
  };
}
