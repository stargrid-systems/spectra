import type { components, operations } from "./generated";

type Schemas = components["schemas"];

export type VersionResponse = Schemas["VersionResponse"];
export type ArtifactSummary = Schemas["ArtifactSummaryResponse"];
export type ArtifactVersion = Schemas["ArtifactVersionResponse"];
export type OrderParam = Schemas["OrderParam"];
export type VersionSortParam = Schemas["VersionSortParam"];

export type ArtifactPage = Schemas["Page_ArtifactSummaryResponse"];
export type ArtifactVersionPage = Schemas["Page_ArtifactVersionResponse"];

export type ListArtifactsParams = NonNullable<operations["listArtifacts"]["parameters"]["query"]>;
export type ListVersionsParams = NonNullable<
  operations["listArtifactVersions"]["parameters"]["query"]
>;
