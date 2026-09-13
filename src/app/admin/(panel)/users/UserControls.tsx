"use client";

import { useState, useTransition } from "react";
import { changeRole, revokeInvite, setUserDisabled, type ActionState } from "./actions";
import ui from "../../admin.module.css";

interface Props {
  userId: string;
  role: "admin" | "editor";
  disabled: boolean;
  neverSignedIn: boolean;
  isSelf: boolean;
}

export function UserControls({ userId, role, disabled, neverSignedIn, isSelf }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);

  const run = (fn: () => Promise<ActionState>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => setResult(await fn()));
  };

  if (isSelf) return <span className={ui.muted}>You</span>;

  return (
    <div>
      <div className={ui.inlineForm}>
        <label className="sr-only" htmlFor={`role-${userId}`}>
          Role
        </label>
        <select
          id={`role-${userId}`}
          className={ui.select}
          defaultValue={role}
          disabled={pending || disabled}
          onChange={(e) => run(() => changeRole(userId, e.target.value))}
        >
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>

        {neverSignedIn ? (
          <button type="button" className={ui.buttonGhost} disabled={pending} onClick={() => run(() => revokeInvite(userId), "Cancel this invitation?")}>
            Cancel invite
          </button>
        ) : disabled ? (
          <button type="button" className={ui.buttonGhost} disabled={pending} onClick={() => run(() => setUserDisabled(userId, false))}>
            Restore access
          </button>
        ) : (
          <button
            type="button"
            className={ui.buttonDanger}
            disabled={pending}
            onClick={() => run(() => setUserDisabled(userId, true), "Remove this person’s access to the admin panel?")}
          >
            Deactivate
          </button>
        )}
      </div>
      {result && !result.ok && (
        <p role="alert" className={`${ui.notice} ${ui.noticeError}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
