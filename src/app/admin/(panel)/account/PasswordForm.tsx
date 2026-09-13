"use client";

import { useActionState } from "react";
import { updatePassword, type PasswordState } from "./actions";
import ui from "../../admin.module.css";

export function PasswordForm({ changed }: { changed: boolean }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(updatePassword, {
    ok: changed,
    message: changed ? "Password updated. Other devices have been signed out." : "",
  });

  return (
    <form action={action} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <input type="email" name="username" autoComplete="username" hidden readOnly />
      <label className={ui.muted}>
        Current password
        <input name="current" type="password" autoComplete="current-password" required className={ui.input} style={{ display: "block", width: "100%", marginTop: 6 }} />
      </label>
      <label className={ui.muted}>
        New password (at least 10 characters)
        <input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} className={ui.input} style={{ display: "block", width: "100%", marginTop: 6 }} />
      </label>
      <label className={ui.muted}>
        Confirm new password
        <input name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={200} className={ui.input} style={{ display: "block", width: "100%", marginTop: 6 }} />
      </label>
      <div>
        <button type="submit" className={ui.button} disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>
      </div>
      {state.message && (
        <p role="status" className={`${ui.notice} ${state.ok ? ui.noticeOk : ui.noticeError}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
