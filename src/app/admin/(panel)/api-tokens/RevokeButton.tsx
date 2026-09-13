"use client";

import { useTransition } from "react";
import { revokeToken } from "./actions";
import ui from "../../admin.module.css";

export function RevokeButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={ui.buttonDanger}
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Revoke “${name}”? Anything using it stops working immediately.`)) startTransition(async () => void (await revokeToken(id)));
      }}
    >
      {pending ? "Revoking…" : "Revoke"}
    </button>
  );
}
