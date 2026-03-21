import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

type CliArgs = {
  runId?: string;
  limit: number;
};

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

function parseArgs(argv: string[]): CliArgs {
  let runId: string | undefined;
  let limit = 5;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--run") {
      runId = argv[i + 1];
      i += 1;
    }
    if (token === "--limit") {
      const parsed = Number.parseInt(argv[i + 1] || "", 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = parsed;
        i += 1;
      }
    }
  }

  return { runId, limit };
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let query = supabase
    .from("ingest_runs")
    .select("id,status,triggered_by,run_mode,backfill_days,fetched_count,upserted_count,llm_failed_count,skipped_count,started_at,ended_at,log")
    .order("started_at", { ascending: false })
    .limit(args.limit);

  if (args.runId) {
    query = supabase
      .from("ingest_runs")
      .select("id,status,triggered_by,run_mode,backfill_days,fetched_count,upserted_count,llm_failed_count,skipped_count,started_at,ended_at,log")
      .eq("id", args.runId)
      .limit(1);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    console.log("No ingest runs found.");
    return;
  }

  for (const run of data) {
    console.log("\n=== ingest run ===");
    console.log(`id: ${run.id}`);
    console.log(`status: ${run.status}`);
    console.log(`triggered_by: ${run.triggered_by}`);
    console.log(`mode: ${run.run_mode}${run.backfill_days ? ` (${run.backfill_days} days)` : ""}`);
    console.log(`fetched: ${run.fetched_count}`);
    console.log(`upserted: ${run.upserted_count}`);
    console.log(`llm_failed: ${run.llm_failed_count}`);
    console.log(`skipped: ${run.skipped_count}`);
    console.log(`started_at: ${run.started_at}`);
    console.log(`ended_at: ${run.ended_at}`);

    const domainStats = (run.log as { domainStats?: Record<string, unknown> } | null)?.domainStats;
    if (domainStats) {
      console.log("domain_stats:");
      console.log(JSON.stringify(domainStats, null, 2));
    }

    const errors = (run.log as { errors?: unknown[] } | null)?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      console.log("errors:");
      console.log(JSON.stringify(errors.slice(0, 20), null, 2));
      if (errors.length > 20) {
        console.log(`... (${errors.length - 20} more)`);
      }
    }
  }
}

main().catch((error) => {
  console.error("Failed to read ingest logs:", error);
  process.exitCode = 1;
});
