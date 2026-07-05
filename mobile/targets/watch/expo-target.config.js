/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "watch",
  name: "OhloWatch",
  displayName: "Ohlo",
  bundleIdentifier: ".watchkitapp",
  deploymentTarget: "10.0",
  // Placeholder — reuses the main app icon until the real logo lands.
  icon: "../../assets/icon.png",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.ohlo.daily"],
  },
};
