export function composePersonaSummary(input: {
  jobTitle: string | null;
  industry: string | null;
  skills: string[] | null;
  interests: string[] | null;
  manualNotes: string | null;
  resumeText: string | null;
}) {
  const segments: string[] = [];

  if (input.jobTitle) {
    segments.push(`Role: ${input.jobTitle}`);
  }
  if (input.industry) {
    segments.push(`Industry: ${input.industry}`);
  }
  if (input.skills?.length) {
    segments.push(`Skills: ${input.skills.join(", ")}`);
  }
  if (input.interests?.length) {
    segments.push(`Interests: ${input.interests.join(", ")}`);
  }
  if (input.manualNotes) {
    segments.push(`Notes: ${input.manualNotes}`);
  }
  if (input.resumeText) {
    segments.push(`Resume context: ${input.resumeText.slice(0, 1200)}`);
  }

  return segments.join(" | ") || "No profile provided yet.";
}
