export type OnboardingProfile = {
  role: string;
  interests: string[];
  ageGroup: string;
  readingPreference: string;
};

const PROFILE_KEY = "knowtok:onboarding-profile";

export function saveProfile(profile: OnboardingProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadProfile(): OnboardingProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return null;
  }
}
