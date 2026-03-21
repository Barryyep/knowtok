import { config as loadDotenv } from "dotenv";

type IngestMode = "daily" | "backfill";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

function parseArgs(argv: string[]) {
  let mode: IngestMode = "daily";
  let days: number | undefined;
  let verbose = true;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--mode") {
      const value = argv[i + 1];
      if (value === "daily" || value === "backfill") {
        mode = value;
        i += 1;
      }
    }
    if (token === "--days") {
      const value = Number.parseInt(argv[i + 1] || "", 10);
      if (Number.isFinite(value) && value > 0) {
        days = value;
        i += 1;
      }
    }
    if (token === "--quiet") {
      verbose = false;
    }
    if (token === "--verbose") {
      verbose = true;
    }
  }

  return { mode, days, verbose };
}

async function main() {
  const { mode, days, verbose } = parseArgs(process.argv.slice(2));
  const { runIngestPipeline } = await import("../src/lib/ingest");

  if (verbose) {
    console.log(`[ingest] env loaded. mode=${mode}${days ? ` days=${days}` : ""}`);
  }

  const result = await runIngestPipeline({
    mode,
    days,
    triggeredBy: "cli",
    verbose,
  });

  console.log("KnowTok ingest run complete:");
  console.log(JSON.stringify(result, null, 2));

  if (result.status === "failed") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Ingest run crashed:", error);
  process.exitCode = 1;
});
