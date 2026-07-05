/**
 * Root route — always redirected by middleware.ts before this renders.
 * This server component acts as a safe fallback only.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RootPage() {
  redirect("/en");
}
