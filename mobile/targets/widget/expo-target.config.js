/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  name: "OhloWidget",
  displayName: "Ohlo",
  bundleIdentifier: ".widget",
  deploymentTarget: "17.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.ohlo.daily"],
  },
  colors: {
    widgetBackground: { color: "#14110D", darkColor: "#14110D" },
    widgetAccent: { color: "#EC4A24", darkColor: "#EC4A24" },
  },
};
