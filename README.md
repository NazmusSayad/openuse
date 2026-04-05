# openuse

`openuse` is a small CLI that reads your local OpenCode SQLite history, matches models against the OpenRouter model catalog, and prints a readable usage + cost report.

## What it does

- Reads usage rows from your OpenCode database (`part` + `message` tables).
- Fetches live model pricing from `https://openrouter.ai/api/v1/models`.
- Matches local model names to OpenRouter model IDs with fuzzy matching.
- Calculates estimated USD cost per model per day.

## Install

Use it directly from npm (no cloning/building needed):

```bash
npx openuse
```

Or install globally:

```bash
npm i -g openuse
openuse
```

## Usage

Run with default database path:

```bash
npx openuse
```

You can also pass your database file as the first CLI argument, or set `OPENCODE_DB_PATH`.

Default DB path if no argument/env is provided:

```text
~/.local/share/opencode/opencode.db
```

## Output

The CLI prints three tables:

- `Daily Usage/Model`: token usage and estimated cost by date + model.
- `Daily Usage/Provider`: token usage and estimated cost by date + provider.
- `Daily Total Usage`: models used, token totals, and total cost by date.

## Requirements

- Node.js 18+
- Access to your OpenCode SQLite database
- Network access to OpenRouter models endpoint
