import { AuthenticatedProviders } from "@/features/globals/providers";
import { MainMenu } from "@/features/main-menu/main-menu";
import { AI_NAME } from "@/features/theme/theme-config";
import ApplicationInsightsProvider from "./application-insights-provider";
import { cn } from "@/ui/lib";
import { getCurrentUser } from "@/features/auth-page/helpers";

import { unstable_noStore as noStore } from "next/cache";
import InfoModal from "@/features/common/info-modal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: AI_NAME,
  description: AI_NAME,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  noStore();
  // Same opt-in gate as the server SDK in instrumentation.ts. Connection
  // string flows to the browser via the client component below; the
  // iKey portion is already public (it's in every telemetry payload).
  const telemetryEnabled = process.env.AZURECHAT_TELEMETRY === "1";
  const connectionString = telemetryEnabled
    ? (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || "")
    : "";
  const user = await getCurrentUser();

  return (
    <AuthenticatedProviders>
      <ApplicationInsightsProvider connectionString={connectionString}>
        <div className={cn("flex flex-1 items-stretch overflow-hidden")}>
          <MainMenu user={user} />
          <div className="flex-1 flex min-w-0 overflow-hidden">{children}</div>
        </div>
        <InfoModal/>
      </ApplicationInsightsProvider>
    </AuthenticatedProviders>
  );
}
