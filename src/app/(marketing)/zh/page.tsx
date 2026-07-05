import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { COPY } from "@/lib/marketing-copy";

export const metadata: Metadata = {
  title: COPY.zh.metaTitle,
  description: COPY.zh.metaDescription,
};

export default function ZhPage() {
  return <MarketingPage locale="zh" />;
}
