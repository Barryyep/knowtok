"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/loading-state";
import { ProfileForm } from "@/components/profile-form";
import { RequireAuth } from "@/components/require-auth";
import { authFetch } from "@/lib/api-client";
import { useLanguage } from "@/lib/language-context";

type InitialProfile = {
  jobTitle: string;
  location: string;
  ageRange: string;
  curiosityTags: string[];
  industry: string;
  skills: string;
  interests: string;
  manualNotes: string;
  hasResume: boolean;
};

const EMPTY_PROFILE: InitialProfile = {
  jobTitle: "",
  location: "",
  ageRange: "",
  curiosityTags: [],
  industry: "",
  skills: "",
  interests: "",
  manualNotes: "",
  hasResume: false,
};

function OnboardingContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [initialProfile, setInitialProfile] = useState<InitialProfile>(EMPTY_PROFILE);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await authFetch("/api/profile", { method: "GET" });
        const payload = await response.json();

        if (!active) return;

        if (payload.onboardingComplete) {
          router.replace("/feed");
          return;
        }

        setInitialProfile({
          jobTitle: payload.persona?.jobTitle || "",
          location: payload.persona?.location || "",
          ageRange: payload.persona?.ageRange || "",
          curiosityTags: payload.persona?.curiosityTags || [],
          industry: payload.persona?.industry || "",
          skills: payload.persona?.skills?.join(", ") || "",
          interests: payload.persona?.interests?.join(", ") || "",
          manualNotes: payload.persona?.manualNotes || "",
          hasResume: Boolean(payload.resume?.hasResume),
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return <LoadingState label="Preparing onboarding..." />;
  }

  return (
    <>
      <section className="mb-4">
        <h2 className="text-2xl font-bold text-label-primary">{t.tellUsAboutYou}</h2>
        <p className="mt-2 text-sm text-label-secondary">
          {t.onboardingSubtitle}
        </p>
      </section>

      <ProfileForm
        initial={initialProfile}
        mode="onboarding"
        onDone={() => {
          router.push("/feed?from=onboarding");
        }}
      />
    </>
  );
}

export default function OnboardingPage() {
  return (
    <RequireAuth fallbackLabel="Validating your session...">
      {() => (
        <AppShell>
          <OnboardingContent />
        </AppShell>
      )}
    </RequireAuth>
  );
}
