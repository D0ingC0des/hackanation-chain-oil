import { useEffect, useState } from "react";
import { getRatePerLiter } from "@/services/rates-service";

export function useRate() {
  const [rate, setRate] = useState(1.2); // fallback enquanto carrega
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRatePerLiter().then(setRate).finally(() => setLoading(false));
  }, []);

  return { rate, loading };
}
