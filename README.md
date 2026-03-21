# T3 Code

T3 Code is a minimal web GUI for coding agents (currently Codex and Claude, more coming soon).

## How to use

> [!WARNING]
> You need to have [Codex CLI](https://github.com/openai/codex) installed and authorized for T3 Code to work.

```bash
npx t3
```

You can also just install the desktop app. It's cooler.

Install the [desktop app from the Releases page](https://github.com/pingdotgg/t3code/releases)

## Local development

```bash
bun run sync:upstream
bun run dev
```

`bun run sync:upstream` expects a clean local `main`, fast-forwards from `upstream/main`, pushes `origin/main`, runs `bun install`, then runs `bun fmt`, `bun lint`, and `bun typecheck`.

## Some notes

We are very very early in this project. Expect bugs.

We are not accepting contributions yet.

## If you REALLY want to contribute still.... read this first

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or PR.

Need support? Join the [Discord](https://discord.gg/jn4EGJjrvv).
