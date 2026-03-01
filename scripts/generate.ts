import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

interface SwaggerSpec {
  paths: Record<string, Record<string, SwaggerOperation>>;
}

interface SwaggerOperation {
  tags?: string[];
  summary?: string;
  operationId?: string;
  parameters?: SwaggerParam[];
}

interface SwaggerParam {
  name: string;
  in: string;
  type?: string;
  required?: boolean;
  description?: string;
  schema?: { type?: string };
}

function generate() {
  const specPath = join(ROOT, "swagger-full.json");
  const spec: SwaggerSpec = JSON.parse(readFileSync(specPath, "utf-8"));

  // Group endpoints by tag
  const byTag: Record<string, string[]> = {};

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (!["get", "post", "put", "delete", "patch"].includes(method)) continue;
      const tag = op.tags?.[0] ?? "Other";
      if (!byTag[tag]) byTag[tag] = [];

      // Compact format: METHOD /path — summary (if available)
      const summary = op.summary?.trim();
      const line = summary
        ? `${method.toUpperCase()} ${path} — ${summary}`
        : `${method.toUpperCase()} ${path}`;
      byTag[tag].push(line);
    }
  }

  // Build compact index string
  const lines: string[] = [];
  const sortedTags = Object.keys(byTag).sort();
  for (const tag of sortedTags) {
    lines.push(`\n[${tag}]`);
    for (const ep of byTag[tag]) {
      lines.push(ep);
    }
  }

  const indexContent = lines.join("\n");

  const outDir = join(ROOT, "src", "generated");
  mkdirSync(outDir, { recursive: true });

  const outFile = join(outDir, "endpoint-index.ts");
  writeFileSync(
    outFile,
    `// Auto-generated from swagger-full.json — do not edit manually\n// Generated: ${new Date().toISOString()}\n\nexport const ENDPOINT_INDEX = ${JSON.stringify(indexContent)};\n`
  );

  // Count stats
  const totalEndpoints = Object.values(byTag).reduce((s, a) => s + a.length, 0);
  console.log(
    `Generated endpoint index: ${totalEndpoints} endpoints across ${sortedTags.length} controllers → ${outFile}`
  );
}

generate();
