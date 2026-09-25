export type Cycle = "weekly" | "monthly" | "quarterly" | "yearly" | "unknown";

export type SubStatus = "active" | "trial" | "possibly_cancelled" | "cancelled";

/** A normalised email, independent of provider (Gmail, Outlook, ...). */
export interface RawEmail {
  id: string; // provider message id
  from: string; // e.g. "Netflix <info@account.netflix.com>"
  subject: string;
  date: string; // ISO timestamp the email was received
  text: string; // plain-text body (HTML already stripped)
}

/** One billing event extracted from one email. */
export interface DetectedCharge {
  emailId: string;
  merchantKey: string; // stable id used to group charges, e.g. "netflix"
  merchant: string; // display name
  category: string;
  domain: string | null; // website used for the logo
  amount: number | null;
  currency: string | null;
  date: string; // YYYY-MM-DD the email was received
  cycle: Cycle; // what the email said explicitly; "unknown" if nothing
  defaultCycle: Cycle; // typical cycle for this merchant, used as last resort
  nextRenewal: string | null; // YYYY-MM-DD if stated in the email
  kind: "charge" | "trial" | "cancellation" | "renewal_notice";
  confidence: number; // 0..1
  method: "rule" | "generic" | "llm";
}

/** A subscription built by grouping charges from the same merchant. */
export interface DetectedSubscription {
  merchantKey: string;
  merchant: string;
  category: string;
  domain: string | null;
  amount: number | null;
  currency: string | null;
  cycle: Cycle;
  lastCharged: string | null;
  nextRenewal: string | null;
  status: SubStatus;
  monthlyCostAED: number | null;
  confidence: number;
  emailIds: string[];
}
