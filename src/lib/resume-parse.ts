import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export type ResumeFileType = "pdf" | "docx";

export interface ParsedResume {
  extractedText: string;
  jobTitle: string | null;
  industry: string | null;
  skills: string[];
  interests: string[];
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pickLineAfterPrefix(text: string, prefixes: string[]): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    for (const prefix of prefixes) {
      const regex = new RegExp(`^${prefix}[:\\-]\\s*(.+)$`, "i");
      const match = line.match(regex);
      if (match?.[1]) {
        return normalize(match[1]);
      }
    }
  }

  return null;
}

function parseListLine(text: string, prefixes: string[]): string[] {
  const picked = pickLineAfterPrefix(text, prefixes);
  if (!picked) {
    return [];
  }

  return picked
    .split(/[,|;/]/)
    .map((item) => normalize(item))
    .filter(Boolean)
    .slice(0, 10);
}

function inferIndustry(text: string): string | null {
  const lower = text.toLowerCase();
  const map: Array<[string, string]> = [
    ["health", "Healthcare"],
    ["finance", "Finance"],
    ["bank", "Finance"],
    ["ecommerce", "E-commerce"],
    ["retail", "Retail"],
    ["education", "Education"],
    ["manufacturing", "Manufacturing"],
    ["software", "Software"],
    ["ai", "Technology"],
    ["data", "Technology"],
    ["marketing", "Marketing"],
  ];

  for (const [keyword, industry] of map) {
    if (lower.includes(keyword)) {
      return industry;
    }
  }

  return null;
}

function inferJobTitle(text: string): string | null {
  const explicit = pickLineAfterPrefix(text, ["title", "role", "position"]);
  if (explicit) {
    return explicit;
  }

  const titleHints = [
    "engineer",
    "developer",
    "designer",
    "manager",
    "analyst",
    "researcher",
    "consultant",
    "product",
    "marketing",
    "sales",
  ];

  const lines = text
    .split(/\r?\n/)
    .map((line) => normalize(line))
    .filter(Boolean)
    .slice(0, 25);

  const candidate = lines.find((line) => {
    const lower = line.toLowerCase();
    return titleHints.some((hint) => lower.includes(hint));
  });

  return candidate || null;
}

export async function extractResumeText(fileBuffer: Buffer, fileType: ResumeFileType): Promise<string> {
  if (fileType === "pdf") {
    const parsed = await pdfParse(fileBuffer);
    return normalize(parsed.text || "");
  }

  const parsed = await mammoth.extractRawText({ buffer: fileBuffer });
  return normalize(parsed.value || "");
}

export async function parseResume(fileBuffer: Buffer, fileType: ResumeFileType): Promise<ParsedResume> {
  const extractedText = await extractResumeText(fileBuffer, fileType);

  const skills = parseListLine(extractedText, ["skills", "core skills", "technologies"]);
  const interests = parseListLine(extractedText, ["interests", "focus", "areas of interest"]);
  const industry = pickLineAfterPrefix(extractedText, ["industry", "domain"]) || inferIndustry(extractedText);
  const jobTitle = inferJobTitle(extractedText);

  return {
    extractedText,
    jobTitle,
    industry,
    skills,
    interests,
  };
}
