/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "watch",
  name: "KnowTokWatch",
  displayName: "KnowTok Daily",
  bundleIdentifier: ".watchkitapp",
  deploymentTarget: "10.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.knowtok.daily"],
  },
};
