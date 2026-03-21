#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM_REMOTE = "upstream";
const UPSTREAM_URL = "https://github.com/pingdotgg/t3code.git";
const GENERATED_FILE = "apps/web/public/mockServiceWorker.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command: string, args: Array<string>): void {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

function capture(command: string, args: Array<string>): string {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
}

function tryCapture(command: string, args: Array<string>): string | undefined {
  try {
    return capture(command, args);
  } catch {
    return undefined;
  }
}

function ensureOnMainBranch(): void {
  const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);

  if (branch !== "main") {
    throw new Error(`sync:upstream must be run from main. Current branch: ${branch}`);
  }
}

function ensureCleanWorktree(): void {
  const status = capture("git", ["status", "--porcelain"]);

  if (status.length > 0) {
    throw new Error("sync:upstream requires a clean working tree.");
  }
}

function ensureUpstreamRemote(): void {
  const remoteUrl = tryCapture("git", ["remote", "get-url", UPSTREAM_REMOTE]);

  if (remoteUrl === undefined) {
    run("git", ["remote", "add", UPSTREAM_REMOTE, UPSTREAM_URL]);
    return;
  }

  if (remoteUrl !== UPSTREAM_URL) {
    throw new Error(`Remote ${UPSTREAM_REMOTE} points to ${remoteUrl}, expected ${UPSTREAM_URL}.`);
  }
}

function isAncestor(baseRef: string, targetRef: string): boolean {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", baseRef, targetRef], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    return true;
  } catch (error) {
    const exitCode =
      typeof error === "object" && error !== null && "status" in error ? error.status : -1;
    if (exitCode === 1) {
      return false;
    }
    throw error;
  }
}

function restoreGeneratedFileIfNeeded(): void {
  try {
    execFileSync("git", ["diff", "--quiet", "HEAD", "--", GENERATED_FILE], {
      cwd: repoRoot,
      stdio: "ignore",
    });
  } catch (error) {
    const exitCode =
      typeof error === "object" && error !== null && "status" in error ? error.status : -1;
    if (exitCode !== 1) {
      throw error;
    }

    run("git", ["restore", "--source=HEAD", "--", GENERATED_FILE]);
  }
}

function syncMainBranch(): void {
  run("git", ["fetch", "origin", "main"]);
  run("git", ["fetch", UPSTREAM_REMOTE, "main"]);

  if (!isAncestor("main", `${UPSTREAM_REMOTE}/main`)) {
    throw new Error("Local main cannot be fast-forwarded to upstream/main.");
  }

  if (!isAncestor("origin/main", `${UPSTREAM_REMOTE}/main`)) {
    throw new Error("origin/main contains commits that are not in upstream/main.");
  }

  const localHead = capture("git", ["rev-parse", "main"]);
  const upstreamHead = capture("git", ["rev-parse", `${UPSTREAM_REMOTE}/main`]);

  if (localHead !== upstreamHead) {
    run("git", ["merge", "--ff-only", `${UPSTREAM_REMOTE}/main`]);
  }

  const originHead = capture("git", ["rev-parse", "origin/main"]);
  const mainHead = capture("git", ["rev-parse", "main"]);

  if (originHead !== mainHead) {
    run("git", ["push", "origin", "main"]);
  }
}

function validateWorkspace(): void {
  run("bun", ["install"]);
  restoreGeneratedFileIfNeeded();
  run("bun", ["fmt"]);
  run("bun", ["lint"]);
  run("bun", ["typecheck"]);
}

function ensureCleanAfterValidation(): void {
  const status = capture("git", ["status", "--porcelain"]);

  if (status.length > 0) {
    throw new Error(`sync:upstream completed, but the working tree is dirty:\n${status}`);
  }
}

function main(): void {
  ensureOnMainBranch();
  ensureCleanWorktree();
  ensureUpstreamRemote();
  syncMainBranch();
  validateWorkspace();
  ensureCleanAfterValidation();

  const head = capture("git", ["rev-parse", "--short", "HEAD"]);
  console.log(`Synced and validated at ${head}. Next: bun run dev`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
