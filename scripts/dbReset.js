import "dotenv/config";
import { execSync } from "node:child_process";

const assertSafeResetTarget = () => {
  const nodeEnv = String(process.env.NODE_ENV || "development").toLowerCase();
  const databaseUrl = String(process.env.DATABASE_URL || "");

  if (nodeEnv === "production") {
    throw new Error("Refusing to run db reset in production mode.");
  }

  const safeHosts = ["localhost", "127.0.0.1", "db:"];
  const isSafeHost = safeHosts.some((host) => databaseUrl.includes(host));

  if (!isSafeHost) {
    throw new Error(
      "Refusing to reset: DATABASE_URL does not look local (expected localhost, 127.0.0.1, or docker db host)."
    );
  }
};

const run = async () => {
  assertSafeResetTarget();

  console.log("[DB RESET] Running prisma migrate reset --force --skip-seed ...");

  execSync("npx prisma migrate reset --force --skip-seed", {
    stdio: "inherit",
    env: process.env,
  });

  console.log("[DB RESET] Completed successfully.");
};

run().catch((error) => {
  console.error("[DB RESET] Failed:", error.message);
  process.exit(1);
});
