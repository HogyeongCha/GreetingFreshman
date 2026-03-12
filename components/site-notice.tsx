"use client";

import { useEffect, useState } from "react";

type Props = {
  kind: "home_notice" | "complete_notice";
  title?: string;
  className?: string;
};

export function SiteNotice({ kind, title, className }: Props) {
  const [content, setContent] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      const response = await fetch(`/api/site-notice?key=${kind}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { content?: string };
      if (active) setContent(payload.content ?? "");
    };

    void load();
    return () => {
      active = false;
    };
  }, [kind]);

  if (!content) return null;

  return (
    <div className={className}>
      {title ? <strong>{title}</strong> : null}
      <p style={{ margin: 0 }}>{content}</p>
    </div>
  );
}
