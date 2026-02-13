import { runIngestPipeline, type IngestMode } from "../src/lib/ingest";

function parseArgs(argv: string[]) {
  let mode: IngestMode = "daily";
  let days: number | undefined;

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
  }

  return { mode, days };
}

async function main() {
  const { mode, days } = parseArgs(process.argv.slice(2));

  const result = await runIngestPipeline({
    mode,
    days,
    triggeredBy: "cli",
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
