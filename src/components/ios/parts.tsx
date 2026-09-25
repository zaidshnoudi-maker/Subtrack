"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { iconColor, splitVia } from "@/lib/format";

/**
 * Company logo in an iOS-style rounded square. Loads the company's own site icon
 * through /api/logo; falls back to a coloured letter if there's no domain or it fails.
 */
export function AppIcon({ name, domain, size = "md" }: { name: string; domain?: string | null; size?: "sm" | "md" | "lg" }) {
  const clean = splitVia(name).name;
  const [failed, setFailed] = useState(false);
  const cls = `app-icon ${size === "md" ? "" : size}`;
  if (domain && !failed) {
    return (
      <span className={`${cls} logo`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/logo?d=${encodeURIComponent(domain)}`} alt="" loading="lazy" onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className={cls} style={{ background: iconColor(clean) }} aria-hidden="true">
      {[...clean][0]?.toUpperCase() ?? "?"}
    </span>
  );
}

export function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 8 14" aria-hidden="true">
      <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** iOS-style bottom sheet (centered dialog on wide screens). */
export function Sheet({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="grabber" />
        {children}
      </div>
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  const node = msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null;
  return { show, node };
}
