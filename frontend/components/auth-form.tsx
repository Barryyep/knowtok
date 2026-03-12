"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const title = useMemo(() => (mode === "login" ? "欢迎回来" : "创建账号"), [mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
        router.push("/today");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          throw error;
        }
        setMessage("注册成功，请检查邮箱或直接登录。");
        setMode("login");
      }
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "认证失败，请重试。";
      setMessage(nextMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel auth-panel">
      <div className="mode-switch">
        <button
          className={mode === "login" ? "pill active" : "pill"}
          onClick={() => setMode("login")}
          type="button"
        >
          登录
        </button>
        <button
          className={mode === "signup" ? "pill active" : "pill"}
          onClick={() => setMode("signup")}
          type="button"
        >
          注册
        </button>
      </div>
      <h2>{title}</h2>
      <p className="muted">登录后才能访问今日卡片，因为后端接口需要 Supabase Bearer token。</p>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>邮箱</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label className="field">
          <span>密码</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            minLength={6}
            required
          />
        </label>
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "处理中..." : mode === "login" ? "登录" : "创建账号"}
        </button>
      </form>
      {message ? <p className="status-message">{message}</p> : null}
    </section>
  );
}
