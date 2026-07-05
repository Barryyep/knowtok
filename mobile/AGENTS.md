# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Testing

**Run command:** `npm test` (executes `vitest run`)

**Where tests live:**
- `src/lib/__tests__/*.test.ts` — pure lib function tests (no simulator)
- `src/components/__tests__/*.test.ts` — pure component utility tests

**Framework:** vitest 4.x, node environment, TypeScript via esbuild.

**Mocking strategy:**
- `react-native` and `expo-modules-core` are aliased to stubs in `vitest.config.ts` (globally; no per-test boilerplate needed)
- `@react-native-async-storage/async-storage`, `@bacons/apple-targets`, and service modules (`supabase`, `goodvision`, etc.) are mocked with `vi.mock()` inside individual test files

**Type check:** `npm run typecheck` (`tsc --noEmit`) must stay green alongside tests.

**Expectation:** every new lib function in `src/lib/` gets at least one meaningful test in the corresponding `__tests__/` file. "Meaningful" means real behavioral assertions (not `toBeDefined` smoke tests). If a function is untestable without deep RN simulator mocking, add a comment explaining why and skip it.
