/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "watch-widget",
  name: "OhloWatchWidget",
  displayName: "Ohlo",
  bundleIdentifier: ".watchkitapp.widget",
  deploymentTarget: "10.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.ohlo.daily"],
  },
};
