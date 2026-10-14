import { readFileSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

// Builds use the same public routing settings as their managed services, rather
// than requiring callers to provide a single (incorrect) base path for all apps.
const packages = JSON.parse(execFileSync("pnpm", ["-r", "list", "--depth", "-1", "--json"], { encoding: "utf8" }));
for (const pkg of packages) {
  const manifest = JSON.parse(readFileSync(join(pkg.path, "package.json"), "utf8"));
  if (!manifest.scripts?.build) continue;
  const env = { ...process.env };
  const artifactFile = join(pkg.path, ".replit-artifact", "artifact.toml");
  if (existsSync(artifactFile)) {
    const toml = readFileSync(artifactFile, "utf8");
    const settings = toml.match(/\[services\.env\]\s*([\s\S]*?)(?=\n\[|$)/)?.[1] ?? "";
    for (const line of settings.split("\n")) {
      const pair = line.match(/^\s*(PORT|BASE_PATH)\s*=\s*"([^"]*)"\s*$/);
      if (pair) env[pair[1]] = pair[2];
    }
  }
  const result = spawnSync("pnpm", ["--filter", manifest.name, "run", "build"], { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
