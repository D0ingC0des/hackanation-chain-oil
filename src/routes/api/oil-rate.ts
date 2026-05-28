import { createFileRoute } from "@tanstack/react-router";
import { getRateConfig } from "@/services/rates-service";

export const Route = createFileRoute("/api/oil-rate")({
  server: {
    handlers: {
      GET: async () => {
        const config = await getRateConfig();

        if (!config) {
          return Response.json({ error: "Rate not configured" }, { status: 404 });
        }

        return new Response(
          JSON.stringify({
            rate_per_liter: parseFloat(config.value),
            currency: "BRL",
            unit: "liter",
            updated_at: config.updated_at,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Cache-Control": "no-store",
            },
          },
        );
      },
    },
  },
});
