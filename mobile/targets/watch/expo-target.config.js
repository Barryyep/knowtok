/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "watch",
  name: "OhloWatch",
  displayName: "Ohlo",
  bundleIdentifier: ".watchkitapp",
  deploymentTarget: "10.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.ohlo.daily"],
  },
};
