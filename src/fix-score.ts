import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { basename, join } from "path";
import {
  REF_DIR,
  bin_size,
  reference_bits,
  task_score,
} from "./run";

type EvalResult = {
  id: string;
  pass: boolean;
  bits: number;
  ref_bits?: number;
  score: number;
  seconds: number;
  created_reference: boolean;
  solution?: string;
  output_path?: string;
  error?: string;
};

type EvalReport = {
  model: string;
  tasks: number;
  evaluated_tasks?: number;
  pass: number;
  created_refs: number;
  score: number;
  results: EvalResult[];
};

function safe_name(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function latest_report(model = "openai/gpt-5.5"): string {
  var dir = join(import.meta.dir, "..", ".eval", safe_name(model));
  var runs = readdirSync(dir)
    .map(name => join(dir, name, "report.json"))
    .filter(path => existsSync(path))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (runs.length === 0) throw new Error(`no reports found in ${dir}`);
  return runs[0];
}

function latest_text_report(model: string): string {
  var dir = join(import.meta.dir, "..", "res");
  var suffix = `.${safe_name(model)}.txt`;
  var reports = readdirSync(dir)
    .filter(name => name.endsWith(suffix))
    .map(name => join(dir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (reports.length === 0) {
    throw new Error(`no text reports found for ${model}`);
  }
  return reports[0];
}

function load_solution(result: EvalResult): string {
  if (result.solution && result.solution.trim() !== "") {
    return result.solution.trim();
  }
  if (!result.output_path) throw new Error(`${result.id}: missing output`);
  return readFileSync(result.output_path, "utf-8").trim();
}

function repair_binary_size_failure(result: EvalResult): boolean {
  if (result.error !== "failed to compute binary size") return false;

  var solution = load_solution(result);
  var bits = bin_size(solution, 60_000);
  var ref = reference_bits(result.id, 60_000);
  var created_reference = false;

  if (ref === undefined) {
    mkdirSync(REF_DIR, { recursive: true });
    writeFileSync(join(REF_DIR, result.id + ".lam"), solution + "\n");
    ref = bits;
    created_reference = true;
  }

  result.pass = true;
  result.bits = bits;
  result.ref_bits = ref;
  result.score = task_score(bits, ref);
  result.created_reference = created_reference;
  delete result.error;
  return true;
}

function recompute_report(report: EvalReport) {
  report.pass = report.results.filter(r => r.pass).length;
  report.created_refs = report.results
    .filter(r => r.created_reference)
    .length;
  report.evaluated_tasks = report.results.length;
  report.score =
    report.results.reduce((sum, r) => sum + r.score, 0) /
    Math.max(report.tasks, 1) *
    100;
}

function build_text_report(report: EvalReport): string {
  var lines: string[] = [];

  lines.push(`score: ${report.score.toFixed(1)}`);
  lines.push(`evaluated: ${report.results.length}/${report.tasks}`);
  lines.push("");
  lines.push("task scores:");

  for (var result of report.results) {
    var task_score = (result.score * 100).toFixed(1);
    var status = result.pass ? "pass" : "fail";
    var time = ` time=${result.seconds.toFixed(1)}s`;
    var bits = result.pass ? ` bits=${result.bits}` : "";
    var ref = result.ref_bits === undefined ? "" : ` ref=${result.ref_bits}`;
    lines.push(`- ${result.id}: ${task_score} ${status}${time}${bits}${ref}`);
  }

  lines.push("");
  lines.push("solutions:");

  for (var result of report.results) {
    lines.push("");
    lines.push(`--- ${result.id} ---`);
    if (result.solution && result.solution.trim() !== "") {
      lines.push(result.solution.trim());
    } else {
      lines.push("(no solution)");
    }
  }

  lines.push("");
  lines.push(`model: ${report.model}`);
  return lines.join("\n") + "\n";
}

function main() {
  var report_path = process.argv[2] ?? latest_report();
  var report: EvalReport = JSON.parse(readFileSync(report_path, "utf-8"));
  var text_path = process.argv[3] ?? latest_text_report(report.model);
  var fixed: string[] = [];

  for (var result of report.results) {
    if (repair_binary_size_failure(result)) fixed.push(result.id);
  }

  recompute_report(report);
  writeFileSync(report_path, JSON.stringify(report, null, 2) + "\n");
  writeFileSync(text_path, build_text_report(report));

  console.log(`report: ${report_path}`);
  console.log(`results: ${text_path}`);
  console.log(`fixed: ${fixed.length ? fixed.join(", ") : "(none)"}`);
  console.log(`${report.pass}/${report.results.length} passed`);
  console.log(`score: ${report.score.toFixed(1)}`);
}

if (import.meta.main) main();
