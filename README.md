# λ-bench

A benchmark of **120 pure lambda calculus** programming problems for AI models.

**[→ Live results](https://victortaelin.github.io/LamBench/)**

## What is this?

λ-bench evaluates how well AI models can implement algorithms using pure lambda calculus. Each problem asks the model to write a program in **Lamb**, a minimal lambda calculus language, using λ-encodings of data structures to implement a specific algorithm.

The model receives a problem description, data encoding specification, and test cases. It must return a single `.lam` program that defines `@main`. The program is then tested against all input/output pairs — if every test passes, the problem is solved.

### v1 Scoring

The **v1 score** is simply the pass rate: solved problems / 120. Future versions will incorporate program size (the evaluation harness already measures solution size in bits against reference implementations).

## The 120 Problems

Problems span **12 categories**, each with 10 tasks:

| Category | Prefix | Description |
|----------|--------|-------------|
| **Algorithms** | `algo_` | BF interpreter, line rasterization, SAT solver, λ-evaluator, convex hull, maze solving, MST, type checker, Sudoku, TSP |
| **Church Naturals** | `cnat_` | add, mul, exp, div, mod, sqr, log, gcd, primality, totient |
| **Church Binaries** | `cbin_` | add, mul, exp, div, mod, sqr, log, gcd, primality, totient |
| **Church Lists** | `clst_` | head, fold, map, nth, reverse, sort, zip, dot product, rotate L/R |
| **Church Trees** | `ctre_` | flatten, BFS, merge, reverse, index, rotate L/R, scan, invert, FFT |
| **Church ADTs** | `cadt_` | construct, destruct, fold, serialize, deserialize, equality, index, length, merge, reverse |
| **Scott Naturals** | `snat_` | add, mul, exp, div, mod, sqr, log, gcd, primality, totient |
| **Scott Binaries** | `sbin_` | add, mul, exp, div, mod, sqr, log, gcd, primality, totient |
| **Scott Lists** | `slst_` | head, fold, map, nth, reverse, sort, zip, dot product, rotate L/R |
| **Scott Trees** | `stre_` | flatten, BFS, merge, reverse, index, rotate L/R, scan, invert, FFT |
| **Scott ADTs** | `sadt_` | construct, destruct, fold, serialize, deserialize, equality, index, length, merge, reverse |
| **N-Tuples** | `ntup_` | head, fold, map, nth, reverse, sort, zip, dot product, rotate L/R |

Problems range from trivial (Church nat addition: `λm.λn.λf.λx.m(f,n(f,x))`) to very hard (BF interpreter, FFT, Sudoku solver — all in pure λ-calculus).

## Current Rankings

| Model | Score |
|-------|-------|
| GPT-5.4 | 101/120 (84.2%) |
| GPT-5.5 | 93/120 (77.5%) |
| Opus 4.7 | 84/120 (70.0%) |
| Gemini 3.1 Pro | 81/120 (67.5%) |
| Opus 4.6 | 56/120 (46.7%) |
| Gemini 3.1 Flash Lite | 48/120 (40.0%) |
| Sonnet 4.6 | 47/120 (39.2%) |
| GPT-5.3 Codex Spark | 14/120 (11.7%) |
| Opus 4.5 | 0/120 (0.0%) |
| Sonnet 4.5 | 0/120 (0.0%) |
| GPT-5.1 | 0/120 (0.0%) |

## Running the Benchmark

### Prerequisites

- [Bun](https://bun.sh) runtime
- API keys for the providers you want to test (stored in `~/.config/`)

### Evaluate a model

```bash
bun install
bun eval <provider/model>

# Examples:
bun eval openai/gpt-5.5
bun eval anthropic/opus-4.7
bun eval google/gemini-3.1-pro-preview

# With options:
bun eval openai/gpt-5.5 --filter algo_ --concurrency 8 --timeout 300
```

Results are written to `res/` as timestamped text files.

### Rebuild the landing page

```bash
bun run site
```

This parses all `res/` files (using the latest run per model) and generates `docs/index.html`.

## Repository Structure

```
lambench/
├── tsk/           # 120 task files (.tsk) — problem descriptions + test cases
├── lam/           # Reference solutions (.lam)
├── res/           # Evaluation results (timestamped per model)
├── src/
│   ├── eval.ts    # Main evaluation harness
│   ├── run.ts     # Task runner (normalizes λ-terms, checks output)
│   ├── parse.ts   # Task file parser
│   └── types.ts   # Type definitions
├── build-site.ts  # Landing page generator
├── docs/
│   └── index.html # Generated landing page (GitHub Pages)
└── README.md
```

## How It Works

1. Each `.tsk` file contains a natural-language problem description followed by `---` and a set of test cases
2. Test cases are `@main(args...)` expressions with expected normalized output
3. The model receives the problem + tests and must produce a `.lam` program
4. The harness appends each test expression to the model's program, normalizes using the Lamb interpreter, and compares output
5. A task passes only if **all** test cases produce the exact expected normal form

## The Lamb Language

Lamb is a minimal pure lambda calculus with named top-level definitions:

```
@true  = λt.λf.t
@false = λt.λf.f
@not   = λb.λt.λf.b(f,t)
@main  = @not(@false)
```

- `λx.body` — lambda abstraction
- `f(x,y)` — application (syntactic sugar for `((f x) y)`)
- `@name` — reference to a top-level definition (may be recursive)
- No built-in data types — everything is λ-encoded

## License

MIT
