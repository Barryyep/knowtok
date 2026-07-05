import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration for Ohlo mobile.
 *
 * Mocked at the alias level (globally, no per-test boilerplate):
 *   react-native          — Platform.OS only; lib files never touch the renderer
 *   expo-modules-core     — requireOptionalNativeModule stub (watchSync.ts)
 *   react-native-url-polyfill/auto — side-effect polyfill; no-op in node
 *
 * Everything else (@react-native-async-storage, @bacons/apple-targets,
 * supabase, goodvision, …) is mocked with vi.mock() inside the test files
 * that actually need them.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "react-native": path.resolve(__dirname, "src/__mocks__/react-native.ts"),
      "expo-modules-core": path.resolve(__dirname, "src/__mocks__/expo-modules-core.ts"),
      "react-native-url-polyfill/auto": path.resolve(
        __dirname,
        "src/__mocks__/empty-module.ts",
      ),
    },
  },
});
