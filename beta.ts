/** Private beta: only emails in BETA_EMAILS (comma-separated) may sign in. Empty or unset = open to everyone. */
export function betaAllowed(email: string | null | undefined): boolean {
  const list = (process.env.BETA_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true;
  return !!email && list.includes(email.trim().toLowerCase());
}
