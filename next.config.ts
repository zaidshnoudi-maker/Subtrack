import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // IMAP + MIME parsing libraries run as plain Node packages on the server.
  serverExternalPackages: ["imapflow", "mailparser"],
};

export default nextConfig;
