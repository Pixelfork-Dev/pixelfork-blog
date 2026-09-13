"use client";

import { useState, useTransition } from "react";
import { createRedirect, deleteRedirect, type RedirectResult } from "./actions";
import ui from "../../admin.module.css";

export interface RedirectRowData {
  id: string;
  fromPath: string;
  toPath: string;
  source: "auto" | "manual";
  hits: number;
  lastHitAt: string | null;
  createdAt: string;
}

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function RedirectManager({ rows }: { rows: RedirectRowData[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<RedirectResult | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () =>
    startTransition(async () => {
      const res = await createRedirect({ from, to });
      setResult(res);
      if (res.ok) {
        setFrom("");
        setTo("");
      }
    });

  const remove = (row: RedirectRowData) => {
    const warn =
      row.source === "auto"
        ? `Remove the redirect from ${row.fromPath}? Old links to it will start returning 404.`
        : `Remove the redirect from ${row.fromPath}?`;
    if (!window.confirm(warn)) return;
    startTransition(async () => setResult(await deleteRedirect(row.id)));
  };

  return (
    <>
      <section className={ui.section} aria-labelledby="add-redirect">
        <h2 id="add-redirect" className={ui.sectionTitle}>
          Add a redirect
        </h2>
        <form
          className={ui.inlineForm}
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className="sr-only" htmlFor="redirect-from">
            Old path
          </label>
          <input id="redirect-from" className={ui.input} style={{ minWidth: 260 }} placeholder="/old-article-url" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className={ui.muted}>→</span>
          <label className="sr-only" htmlFor="redirect-to">
            New path or URL
          </label>
          <input id="redirect-to" className={ui.input} style={{ minWidth: 260 }} placeholder="/posts/new-article or https://…" value={to} onChange={(e) => setTo(e.target.value)} />
          <button type="submit" className={ui.button} disabled={pending || !from || !to}>
            Add redirect
          </button>
        </form>
        {result && (
          <p role={result.ok ? "status" : "alert"} className={`${ui.notice} ${result.ok ? ui.noticeOk : ui.noticeError}`}>
            {result.fieldErrors?.from ?? result.fieldErrors?.to ?? result.message}
          </p>
        )}
      </section>

      <section className={ui.section} aria-labelledby="all-redirects">
        <h2 id="all-redirects" className={ui.sectionTitle}>
          Redirects ({rows.length})
        </h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Type</th>
                <th>Hits</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={ui.strong}>{r.fromPath}</td>
                  <td>
                    <a href={r.toPath} target="_blank" rel="noreferrer" className={ui.link}>
                      {r.toPath}
                    </a>
                  </td>
                  <td>
                    <span className={ui.badge} title={r.source === "auto" ? "Created when a live URL changed" : "Added by hand"}>
                      {r.source === "auto" ? "automatic" : "manual"}
                    </span>
                  </td>
                  <td className={ui.muted} title={r.lastHitAt ? `Last used ${date(r.lastHitAt)}` : "Not used yet"}>
                    {r.hits}
                  </td>
                  <td className={`${ui.muted} ${ui.nowrap}`}>{date(r.createdAt)}</td>
                  <td>
                    <button type="button" className={ui.buttonDanger} disabled={pending} onClick={() => remove(r)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className={ui.empty}>No redirects yet. They’re created automatically when you change the URL of a live post, tag or author.</p>}
        </div>
      </section>
    </>
  );
}
