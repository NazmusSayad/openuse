# openuse

`openuse` is a small CLI that reads your local OpenCode SQLite history, matches models against the OpenRouter model catalog, and prints a readable usage + cost report.

## What it does

- Reads usage rows from your OpenCode database (`part` + `message` tables).
- Fetches live model pricing from `https://openrouter.ai/api/v1/models`.
- Matches local model names to OpenRouter model IDs with fuzzy matching.
- Calculates estimated USD cost per day/model.
- Prints clean terminal tables with humanized token counts (`K`, `M`, `B`, `T`).

## Install

```bash
npm install
```

## Usage

Build first:

```bash
npm run build
```

Run with default database path:

```bash
node dist/index.js
```

Run with an explicit database path:

```bash
node dist/index.js "/path/to/opencode.db"
```

Or use environment variable:

```bash
OPENCODE_DB_PATH="/path/to/opencode.db" node dist/index.js
```

Default DB path if no argument/env is provided:

```text
~/.local/share/opencode/opencode.db
```

## Output

The CLI prints two tables:

- `Per day/model`: token usage and estimated cost by day + model.
- `Daily totals`: total token usage, unmatched model count, and total cost by day.

Notes:

- Token columns are humanized for readability.
- Cost values are rounded to 4 decimal places for display.
- If a model cannot be matched to OpenRouter pricing, row cost is shown as `unmatched` and counted in `Unknown Models`.

## Available scripts

- `npm run build` - build CLI into `dist/`
- `npm run start` - run source in watch mode
- `npm run dev` - watch build + typecheck
- `npm run lint` - run eslint
- `npm run fix` - eslint autofix
- `npm run test` - run tests with bun

## Requirements

- Node.js 18+
- Access to your OpenCode SQLite database
- Network access to OpenRouter models endpoint
