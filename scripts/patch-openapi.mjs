import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const specPath = resolve("openapi/openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));

spec.components ??= {};
spec.components.schemas ??= {};

const missing = {
  OrderParam: {
    type: "string",
    enum: ["asc", "desc"],
    description: "Sort direction shared by list endpoints.",
  },
  VersionSortParam: {
    type: "string",
    enum: ["downloaded_at", "size_bytes"],
    description: "Field a version listing is sorted by.",
  },
  DownloadStatusParam: {
    type: "string",
    enum: ["running", "succeeded", "failed", "interrupted"],
    description: "Filter for download status.",
  },
};

for (const [name, schema] of Object.entries(missing)) {
  if (!spec.components.schemas[name]) {
    spec.components.schemas[name] = schema;
  }
}

const versionPath = spec.paths["/api/v1/version"];
if (versionPath?.get?.operationId === "get_version") {
  versionPath.get.operationId = "get_gateway_version";
}

writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
