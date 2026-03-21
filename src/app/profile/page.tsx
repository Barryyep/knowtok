"use client";

import { useEffect, useState } from "react";
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

function ProfileContent() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [initialProfile, setInitialProfile] = useState<InitialProfile>(EMPTY_PROFILE);

  const refreshProfile = async () => {
    const response = await authFetch("/api/profile", { method: "GET" });
    const payload = await response.json();

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
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await refreshProfile();
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingState label="Loading profile..." />;
  }

  return (
    <>
      <section className="mb-4">
        <h2 className="text-2xl font-bold text-label-primary">{t.profile}</h2>
        <p className="mt-2 text-sm text-label-secondary">
          Update your role, interests, and resume so relevance insights can map papers to your context.
        </p>
      </section>

      <ProfileForm initial={initialProfile} mode="settings" onDone={() => void refreshProfile()} />
    </>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth fallbackLabel="Checking account...">
      {() => (
        <AppShell>
          <ProfileContent />
        </AppShell>
      )}
    </RequireAuth>
  );
}
