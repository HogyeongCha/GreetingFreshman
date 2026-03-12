"use client";

import { ReactNode, useId, useState } from "react";

type Props = {
  title: string;
  children: ReactNode;
  ariaLabel: string;
};

export function InfoDialogButton({ title, children, ariaLabel }: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="info-icon-button"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        i
      </button>
      {open ? (
        <div className="dialog-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <section
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-header">
              <h3 id={titleId} style={{ margin: 0 }}>
                {title}
              </h3>
              <button type="button" className="dialog-close-button" aria-label="닫기" onClick={() => setOpen(false)}>
                닫기
              </button>
            </div>
            <div className="dialog-content stack">{children}</div>
          </section>
        </div>
      ) : null}
    </>
  );
}
