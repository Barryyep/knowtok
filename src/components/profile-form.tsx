"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api-client";
import { CURIOSITY_TAGS } from "@/lib/constants";
import { useLanguage } from "@/lib/language-context";
import { isOnboardingComplete, splitCsv } from "@/lib/profile";

type ProfileState = {
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

const AGE_RANGE_OPTIONS = [
  "Under 18",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55+",
];

export function ProfileForm({
  initial,
  mode,
  onDone,
}: {
  initial: ProfileState;
  mode: "onboarding" | "settings";
  onDone?: () => void;
}) {
  const { lang, setLang, t } = useLanguage();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const completion = useMemo(
    () =>
      isOnboardingComplete({
        jobTitle: form.jobTitle,
        industry: form.industry,
        skills: splitCsv(form.skills),
        interests: splitCsv(form.interests),
        manualNotes: form.manualNotes,
        hasResume: form.hasResume,
      }),
    [form],
  );

  const updateField = (key: keyof ProfileState, value: string | boolean | string[]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const toggleCuriosityTag = (tag: string) => {
    setForm((previous) => {
      const tags = previous.curiosityTags.includes(tag)
        ? previous.curiosityTags.filter((t) => t !== tag)
        : [...previous.curiosityTags, tag];
      return { ...previous, curiosityTags: tags };
    });
  };

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authFetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: form.jobTitle || null,
          location: form.location || null,
          ageRange: form.ageRange || null,
          curiosityTags: form.curiosityTags,
          industry: form.industry || null,
          skills: splitCsv(form.skills),
          interests: splitCsv(form.interests),
          manualNotes: form.manualNotes || null,
          language: lang,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save profile");
      }

      setMessage("Profile saved.");
      if (mode === "settings" && onDone) {
        onDone();
      }
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const uploadResume = async (file: File | null) => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      const data = new FormData();
      data.set("resume", file);

      const response = await authFetch("/api/profile/resume", {
        method: "POST",
        body: data,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Resume upload failed");
      }

      setForm((prev) => ({
        ...prev,
        jobTitle: payload.persona?.jobTitle || prev.jobTitle,
        industry: payload.persona?.industry || prev.industry,
        skills: payload.persona?.skills?.join(", ") || prev.skills,
        interests: payload.persona?.interests?.join(", ") || prev.interests,
        hasResume: true,
      }));

      setMessage("Resume parsed and profile updated.");
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const continueNext = () => {
    if (!completion) {
      setError("Add at least one profile field or upload a resume to continue.");
      return;
    }
    if (onDone) {
      onDone();
    }
  };

  return (
    <section className="card-surface p-6 md:p-8">
      {/* Language selector */}
      <div className="mb-4">
        <p className="text-sm text-label-secondary">{t.language}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`pill-button min-h-[44px] ${lang === "en" ? "bg-accent text-white border-accent" : ""}`}
            onClick={() => setLang("en")}
          >
            EN
          </button>
          <button
            type="button"
            className={`pill-button min-h-[44px] ${lang === "zh" ? "bg-accent text-white border-accent" : ""}`}
            onClick={() => setLang("zh")}
          >
            中文
          </button>
        </div>
      </div>

      {/* Job title */}
      <label className="block text-sm text-label-secondary">
        {t.jobTitle}
        <input
          className="input-field mt-2"
          value={form.jobTitle}
          onChange={(event) => updateField("jobTitle", event.target.value)}
          placeholder="e.g. Product Manager"
        />
      </label>

      {/* Location */}
      <label className="mt-4 block text-sm text-label-secondary">
        {t.location}
        <input
          className="input-field mt-2"
          value={form.location}
          onChange={(event) => updateField("location", event.target.value)}
          placeholder="e.g. San Francisco, CA"
        />
      </label>

      {/* Age range */}
      <label className="mt-4 block text-sm text-label-secondary">
        {t.ageRange}
        <select
          className="input-field mt-2"
          value={form.ageRange}
          onChange={(event) => updateField("ageRange", event.target.value)}
        >
          <option value="">Select age range</option>
          {AGE_RANGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {/* Curiosity tags */}
      <div className="mt-4">
        <p className="text-sm text-label-secondary">{t.curiosityTags}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CURIOSITY_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`pill-button min-h-[44px] ${
                form.curiosityTags.includes(tag)
                  ? "bg-accent text-white border-accent"
                  : ""
              }`}
              onClick={() => toggleCuriosityTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary fields */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm text-label-secondary">
          {t.industry}
          <input
            className="input-field mt-2"
            value={form.industry}
            onChange={(event) => updateField("industry", event.target.value)}
            placeholder="e.g. FinTech"
          />
        </label>

        <label className="text-sm text-label-secondary">
          {t.skills}
          <input
            className="input-field mt-2"
            value={form.skills}
            onChange={(event) => updateField("skills", event.target.value)}
            placeholder="python, data analysis, storytelling"
          />
        </label>

        <label className="text-sm text-label-secondary">
          {t.interests}
          <input
            className="input-field mt-2"
            value={form.interests}
            onChange={(event) => updateField("interests", event.target.value)}
            placeholder="healthcare, climate, education"
          />
        </label>
      </div>

      {/* Manual notes */}
      <label className="mt-4 block text-sm text-label-secondary">
        {t.notes}
        <textarea
          className="input-field mt-2 min-h-[120px]"
          value={form.manualNotes}
          onChange={(event) => updateField("manualNotes", event.target.value)}
          placeholder="What should the app know about your work and goals?"
        />
      </label>

      {/* Resume upload (optional) */}
      <div className="mt-6 rounded-button border border-dashed border-separator p-4">
        <p className="text-sm text-label-secondary">{t.resume}</p>
        <input
          className="mt-2 block w-full text-sm text-label-secondary file:mr-3 file:rounded-button file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            void uploadResume(file);
          }}
        />
        <p className="mt-2 text-xs text-label-tertiary">Resume status: {form.hasResume ? "Uploaded" : "Not uploaded"}</p>
      </div>

      {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="primary-button min-h-[44px]" disabled={saving} onClick={saveProfile} type="button">
          {saving ? "Saving..." : t.saveProfile}
        </button>

        <span className="pill-button min-h-[44px]">{uploading ? "Parsing resume..." : "Resume parser ready"}</span>

        {mode === "onboarding" ? (
          <button className="pill-button min-h-[44px]" onClick={continueNext} type="button">
            Continue to feed
          </button>
        ) : null}
      </div>
    </section>
  );
}
