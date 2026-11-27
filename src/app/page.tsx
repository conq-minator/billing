import { CounterScreen } from "@/components/CounterScreen";
import { DemoBanner } from "@/components/DemoBanner";
import { MicButton } from "@/components/MicButton";
import { getEnv } from "@/config/env";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const env = getEnv();

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner reasons={env.fallbackReasons} />
      <CounterScreen
        demoMode={env.DEMO_MODE}
        micSlot={
          <MicButton
            sttProvider={env.effectiveSttProvider}
            ttsProvider={env.effectiveTtsProvider}
          />
        }
      />
    </div>
  );
}
