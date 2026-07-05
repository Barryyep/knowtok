import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { COPY } from "@/lib/marketing-copy";

export const metadata: Metadata = {
  title: COPY.en.metaTitle,
  description: COPY.en.metaDescription,
};

export default function EnPage() {
  return <MarketingPage locale="en" />;
}
