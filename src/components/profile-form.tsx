"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api-client";
import { isOnboardingComplete, splitCsv } from "@/lib/profile";

type ProfileState = {
  jobTitle: string;
  industry: string;
  skills: string;
  interests: string;
  manualNotes: string;
  hasResume: boolean;
};

export function ProfileForm({
  initial,
  mode,
  onDone,
}: {
  initial: ProfileState;
  mode: "onboarding" | "settings";
  onDone?: () => void;
}) {
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

  const updateField = (key: keyof ProfileState, value: string | boolean) => {
    setForm((previous) => ({ ...previous, [key]: value }));
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
          industry: form.industry || null,
          skills: splitCsv(form.skills),
          interests: splitCsv(form.interests),
          manualNotes: form.manualNotes || null,
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
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-label-secondary">
          Job title
          <input
            className="input-field mt-2"
            value={form.jobTitle}
            onChange={(event) => updateField("jobTitle", event.target.value)}
            placeholder="e.g. Product Manager"
          />
        </label>

        <label className="text-sm text-label-secondary">
          Industry
          <input
            className="input-field mt-2"
            value={form.industry}
            onChange={(event) => updateField("industry", event.target.value)}
            placeholder="e.g. FinTech"
          />
        </label>

        <label className="text-sm text-label-secondary">
          Skills (comma separated)
          <input
            className="input-field mt-2"
            value={form.skills}
            onChange={(event) => updateField("skills", event.target.value)}
            placeholder="python, data analysis, storytelling"
          />
        </label>

        <label className="text-sm text-label-secondary">
          Interests (comma separated)
          <input
            className="input-field mt-2"
            value={form.interests}
            onChange={(event) => updateField("interests", event.target.value)}
            placeholder="healthcare, climate, education"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm text-label-secondary">
        Notes
        <textarea
          className="input-field mt-2 min-h-[120px]"
          value={form.manualNotes}
          onChange={(event) => updateField("manualNotes", event.target.value)}
          placeholder="What should the app know about your work and goals?"
        />
      </label>

      <div className="mt-4 rounded-button border border-dashed border-separator p-4">
        <p className="text-sm text-label-secondary">Upload resume (PDF or DOCX, max 10MB)</p>
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
        <button className="primary-button" disabled={saving} onClick={saveProfile} type="button">
          {saving ? "Saving..." : "Save profile"}
        </button>

        <span className="pill-button">{uploading ? "Parsing resume..." : "Resume parser ready"}</span>

        {mode === "onboarding" ? (
          <button className="pill-button" onClick={continueNext} type="button">
            Continue to feed
          </button>
        ) : null}
      </div>
    </section>
  );
}
