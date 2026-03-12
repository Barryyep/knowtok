"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { loadProfile, OnboardingProfile, saveProfile } from "@/lib/storage";

const interestOptions = ["AI", "生物", "医学", "材料", "艺术科技", "机器人"];

const initialProfile: OnboardingProfile = {
  role: "",
  interests: [],
  ageGroup: "",
  readingPreference: "",
};

export function OnboardingForm() {
  const [profile, setProfile] = useState<OnboardingProfile>(initialProfile);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const existing = loadProfile();
    if (existing) {
      setProfile(existing);
    }
  }, []);

  function toggleInterest(interest: string) {
    setProfile((current: OnboardingProfile) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item: string) => item !== interest)
        : [...current.interests, interest],
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveProfile(profile);
    setSaved(true);
    window.setTimeout(() => {
      router.push("/today");
    }, 600);
  }

  return (
    <section className="panel">
      <h2>告诉我们你想怎么读科研</h2>
      <p className="muted">P0 阶段先保存在浏览器本地，用来驱动后续个性化。</p>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>职业 / 身份</span>
          <input
            placeholder="例如：产品经理、学生、设计师"
            value={profile.role}
            onChange={(event) =>
              setProfile((current: OnboardingProfile) => ({ ...current, role: event.target.value }))
            }
            required
          />
        </label>
        <fieldset className="field">
          <span>兴趣方向</span>
          <div className="chip-grid">
            {interestOptions.map((interest) => (
              <button
                key={interest}
                className={profile.interests.includes(interest) ? "chip active" : "chip"}
                onClick={() => toggleInterest(interest)}
                type="button"
              >
                {interest}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>年龄段</span>
          <select
            value={profile.ageGroup}
            onChange={(event) =>
              setProfile((current: OnboardingProfile) => ({ ...current, ageGroup: event.target.value }))
            }
            required
          >
            <option value="">请选择</option>
            <option value="18-24">18-24</option>
            <option value="25-34">25-34</option>
            <option value="35-44">35-44</option>
            <option value="45+">45+</option>
          </select>
        </label>
        <label className="field">
          <span>阅读偏好</span>
          <select
            value={profile.readingPreference}
            onChange={(event) =>
              setProfile((current: OnboardingProfile) => ({
                ...current,
                readingPreference: event.target.value,
              }))
            }
            required
          >
            <option value="">请选择</option>
            <option value="朋友型">朋友型</option>
            <option value="冷静型">冷静型</option>
            <option value="直接结论">直接结论</option>
          </select>
        </label>
        <button className="primary-button" type="submit">
          保存偏好
        </button>
      </form>
      {saved ? <p className="status-message">已保存，正在进入今日卡片...</p> : null}
    </section>
  );
}
