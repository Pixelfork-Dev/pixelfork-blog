"use client";

import { useActionState, useState } from "react";
import { createToken, type CreateTokenState } from "./actions";
import ui from "../../admin.module.css";

export function TokenForm({ scopes }: { scopes: [string, string][] }) {
  const [state, action, pending] = useActionState<CreateTokenState, FormData>(createToken, { ok: false, message: "" });
  const [copied, setCopied] = useState(false);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <form action={action} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <input name="name" required maxLength={60} placeholder="e.g. Claude automation" className={ui.input} aria-label="Token name" />
        <fieldset style={{ border: 0, padding: 0, display: "grid", gap: 8 }}>
          <legend className={ui.muted} style={{ marginBottom: 6 }}>
            Permissions
          </legend>
          {scopes.map(([scope, label]) => (
            <label key={scope} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <input type="checkbox" name="scopes" value={scope} defaultChecked={scope === "drafts:create"} />
              <span>
                <code>{scope}</code> <span className={ui.muted}>— {label}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <button type="submit" className={ui.button} disabled={pending}>
            {pending ? "Creating…" : "Create token"}
          </button>
        </div>
        {state.message && <p className={`${ui.notice} ${state.ok ? ui.noticeOk : ui.noticeError}`}>{state.message}</p>}
      </form>

      {state.token && (
        <div className={ui.section} style={{ margin: 0 }}>
          <p className={ui.sectionTitle}>Your new token</p>
          <div className={ui.inlineForm}>
            <input readOnly value={state.token} className={ui.input} style={{ flex: 1, minWidth: 280, fontFamily: "monospace" }} onFocus={(e) => e.target.select()} />
            <button
              type="button"
              className={ui.buttonGhost}
              onClick={async () => {
                await navigator.clipboard.writeText(state.token!);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className={`${ui.notice} ${ui.muted}`}>Store it in a password manager or the macOS Keychain. Anyone with this token can use its permissions.</p>
        </div>
      )}
    </div>
  );
}
