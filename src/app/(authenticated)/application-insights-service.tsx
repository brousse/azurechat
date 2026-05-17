"use client";

import { ApplicationInsights, ITelemetryItem } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { SessionContextValue } from 'next-auth/react';

// Single shared instances across the whole React tree. Returning a new
// ReactPlugin on re-renders would churn the AppInsightsContext value and
// re-register hooks downstream.
let logger: ApplicationInsights | undefined;
let sharedReactPlugin: ReactPlugin | undefined;

function initializeTelemetry(connectionString: string, session: SessionContextValue): { reactPlugin: ReactPlugin, appInsights: ApplicationInsights | undefined } {
  if (sharedReactPlugin) {
    return { reactPlugin: sharedReactPlugin, appInsights: logger };
  }

  const reactPlugin = new ReactPlugin();
  sharedReactPlugin = reactPlugin;

  if (!connectionString) {
    // Telemetry disabled. The provider still needs a non-null plugin for
    // the React context, but we skip SDK init entirely.
    return { reactPlugin, appInsights: undefined };
  }

  const defaultBrowserHistory = {
    url: "/",
    location: { pathname: "" },
    state: { url: "" },
    listen: () => {},
  };

  let browserHistory = defaultBrowserHistory;

  if (typeof window !== "undefined") {
    browserHistory = { ...browserHistory, ...window.history };
    browserHistory.location.pathname = browserHistory?.state?.url;
  }

  const appInsights = new ApplicationInsights({
    config: {
      // Full connection string (modern). The legacy `instrumentationKey`
      // form was deprecated by Microsoft in 2022.
      connectionString,
      extensions: [reactPlugin],
      extensionConfig: {
        [reactPlugin.identifier]: { history: browserHistory },
      },
      // Deliberately minimal browser capture: request/dependency telemetry
      // is collected server-side by @azure/monitor-opentelemetry. The
      // browser SDK here only carries React error-boundary events through
      // the ReactPlugin. Re-enabling the *Tracking flags below would
      // double-count requests and multiply telemetry volume.
      enableAutoRouteTracking: false,
      disableAjaxTracking: true,
      disableFetchTracking: true,
      autoTrackPageVisitTime: false,
      enableCorsCorrelation: true,
      enableRequestHeaderTracking: true,
      enableResponseHeaderTracking: true,
    }
  });

  appInsights.loadAppInsights();

  appInsights.addTelemetryInitializer((env: ITelemetryItem) => {
    env.tags = env.tags || {};
    env.data = env.data || {};
    if (env.tags) {
      env.tags["ai.cloud.role"] = "Bühler ChatGPT";
    }
    if (env.data) {
      env.data["email"] = session?.data?.user?.email;
    }
  });

  logger = appInsights;
  return { reactPlugin, appInsights };
}

export { initializeTelemetry, logger };
