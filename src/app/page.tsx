import { DemoBanner } from "@/components/DemoBanner";
import { getEnv } from "@/config/env";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const env = getEnv();

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner reasons={env.fallbackReasons} />
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Boli-Quote</h1>
        <p className="mt-2 text-sm text-stone-600">
          Speak the bill, skip the keyboard.
        </p>
      </main>
    </div>
  );
}
