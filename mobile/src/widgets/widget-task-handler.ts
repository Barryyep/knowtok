import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { getTodayFactSafe } from "../lib/factService";
import { loadProfile } from "../lib/storage";
import { FactWidget } from "./FactWidget";

/**
 * Runs headlessly whenever Android asks the widget to (re)draw:
 * WIDGET_ADDED, WIDGET_UPDATE (every updatePeriodMillis), WIDGET_RESIZED.
 * If the cached fact is from a previous day this regenerates it in the
 * background, so the widget rolls over at midnight even if the app is
 * never opened. Network failures fall back to the cached fact.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const profile = await loadProfile();
      const fact = await getTodayFactSafe(profile);
      props.renderWidget(
        React.createElement(FactWidget, {
          fact,
          language: profile?.language ?? "zh",
        }),
      );
      break;
    }
    default:
      break;
  }
}
