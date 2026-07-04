/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  name: "KnowTokWidget",
  displayName: "KnowTok Daily",
  bundleIdentifier: ".widget",
  deploymentTarget: "17.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.knowtok.daily"],
  },
  colors: {
    widgetBackground: { color: "#0B0F1A", darkColor: "#0B0F1A" },
    widgetAccent: { color: "#7C9EFF", darkColor: "#7C9EFF" },
  },
};
