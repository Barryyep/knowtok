export type PersonaPayload = {
  jobTitle?: string | null;
  industry?: string | null;
  skills?: string[];
  interests?: string[];
  manualNotes?: string | null;
  location?: string | null;
  ageRange?: string | null;
  curiosityTags?: string[];
};

export function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isOnboardingComplete(input: {
  jobTitle?: string | null;
  industry?: string | null;
  skills?: string[] | null;
  interests?: string[] | null;
  manualNotes?: string | null;
  hasResume?: boolean;
  curiosityTags?: string[] | null;
}): boolean {
  const hasAnyField = Boolean(
    input.jobTitle?.trim() ||
      input.industry?.trim() ||
      input.manualNotes?.trim() ||
      (input.skills && input.skills.length > 0) ||
      (input.interests && input.interests.length > 0) ||
      (input.curiosityTags && input.curiosityTags.length > 0),
  );

  return hasAnyField || Boolean(input.hasResume);
}
