import { registerRootComponent } from "expo";
import { Platform } from "react-native";
import { registerWidgetTaskHandler } from "react-native-android-widget";

import App from "./App";
import { widgetTaskHandler } from "./src/widgets/widget-task-handler";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// The widget task handler runs headlessly when Android (re)draws the widget;
// registration uses AppRegistry.registerHeadlessTask, which only exists on Android.
registerRootComponent(App);
if (Platform.OS === "android") {
  registerWidgetTaskHandler(widgetTaskHandler);
}
