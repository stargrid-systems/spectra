#!/usr/bin/env node
// Extracts the OpenAPI components the task input/output JSON Schemas can
// $ref, for client-side resolution. Page envelopes are never referenced by
// task schemas and only bloat the bundle, so they are dropped.

import { readFileSync, writeFileSync } from "node:fs";

const specPath = new URL("../modules/aperture/openapi.json", import.meta.url);
const outPath = new URL("../modules/aperture/runtime/taskSchemaComponents.json", import.meta.url);

const spec = JSON.parse(readFileSync(specPath, "utf8"));
const components = spec.components?.schemas ?? {};

const trimmed = Object.fromEntries(
  Object.entries(components).filter(([name]) => !name.startsWith("Page_")),
);

const body = JSON.stringify(trimmed, null, 2) + "\n";
writeFileSync(outPath, body);
console.log(
  `taskSchemaComponents.json: ${Object.keys(trimmed).length} schemas, ${body.length} bytes`,
);
