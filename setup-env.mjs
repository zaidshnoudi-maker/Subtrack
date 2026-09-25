// Creates .env.local from .env.example (if missing) and fills in generated secrets.
// Safe to run repeatedly: never overwrites values that are already set.
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const file = ".env.local";
if (!existsSync(file)) {
  copyFileSync(".env.example", file);
  console.log("Created .env.local");
}
let env = readFileSync(file, "utf8");
const fill = (name, value) => {
  const re = new RegExp(`^${name}=\\s*$`, "m");
  if (re.test(env)) {
    env = env.replace(re, `${name}=${value}`);
    console.log(`Generated ${name}`);
  } else if (!new RegExp(`^${name}=`, "m").test(env)) {
    env += `\n${name}=${value}\n`;
    console.log(`Added ${name}`);
  }
};
fill("TOKEN_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
fill("CRON_SECRET", randomBytes(24).toString("hex"));
writeFileSync(file, env);
