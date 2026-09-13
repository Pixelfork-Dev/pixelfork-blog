"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type AuthFormState } from "./actions";
import ui from "../admin.module.css";
import styles from "./login.module.css";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const [state, action, pending] = useActionState<AuthFormState, FormData>(isRegister ? register : login, { message: "" });

  return (
    <form action={action} className={styles.form}>
      {state.message && (
        <p role="alert" className={`${ui.notice} ${ui.noticeError}`}>
          {state.message}
        </p>
      )}
      {isRegister && (
        <label className={styles.field}>
          <span>Name</span>
          <input name="name" autoComplete="name" required maxLength={80} defaultValue={state.name} className={ui.input} />
        </label>
      )}
      <label className={styles.field}>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={state.email} className={ui.input} />
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? 10 : undefined}
          maxLength={200}
          className={ui.input}
        />
      </label>
      {isRegister && (
        <label className={styles.field}>
          <span>Confirm password</span>
          <input name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={200} className={ui.input} />
          <small className={ui.muted}>At least 10 characters.</small>
        </label>
      )}
      <button type="submit" className={`${ui.button} ${styles.full}`} disabled={pending}>
        {pending ? (isRegister ? "Creating account…" : "Signing in…") : isRegister ? "Create account" : "Sign in"}
      </button>
      <p className={styles.switch}>
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/admin/login" className={ui.link}>
              Sign in
            </Link>
          </>
        ) : (
          <>
            Invited to the team?{" "}
            <Link href="/admin/register" className={ui.link}>
              Create your account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
