"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteUser, type ActionState } from "./actions";
import ui from "../../admin.module.css";

const initial: ActionState = { ok: false, message: "" };

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteUser, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action}>
      <div className={ui.inlineForm}>
        <label className="sr-only" htmlFor="invite-email">
          Email
        </label>
        <input id="invite-email" name="email" type="email" required placeholder="name@pixelfork.ai" className={ui.input} style={{ minWidth: 260 }} />
        <label className="sr-only" htmlFor="invite-role">
          Role
        </label>
        <select id="invite-role" name="role" defaultValue="editor" className={ui.select}>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className={ui.button} disabled={pending}>
          {pending ? "Inviting…" : "Invite"}
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
