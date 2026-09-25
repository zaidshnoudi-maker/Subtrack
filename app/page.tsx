import Link from "next/link";
import { SignInForm } from "@/components/SignInForm";

export default function Home() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return (
    <div className="screen" style={{ maxWidth: 440, paddingTop: 48 }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 14, textAlign: "center" }}>
        <span className="app-icon lg" style={{ background: "var(--blue)" }} aria-hidden="true">
          S
        </span>
        <h1 className="large-title" style={{ margin: 0 }}>
          SubTrack
        </h1>
        <p style={{ margin: 0, color: "var(--label-2)" }}>
          Every subscription in one place. SubTrack finds them in your iCloud Mail and reminds you before you pay.
        </p>
      </div>

      <div className="group with-icons" style={{ marginTop: 28 }}>
        {[
          ["var(--green)", "✓", "Found automatically", "From receipts in your inbox"],
          ["var(--orange)", "!", "Reminders before renewals", "And before free trials turn paid"],
          ["var(--indigo)", "◷", "Private", "Email content is never stored"],
        ].map(([bg, glyph, title, sub]) => (
          <div className="row" key={title}>
            <span className="app-icon sm" style={{ background: bg }} aria-hidden="true">
              {glyph}
            </span>
            <div className="row-main">
              <div className="title">
                <span className="t">{title}</span>
              </div>
              <div className="subtitle">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        {configured ? <SignInForm /> : <div className="note">Add the Supabase keys to enable sign-in.</div>}
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <Link href="/demo">See a demo first</Link>
      </div>
    </div>
  );
}
