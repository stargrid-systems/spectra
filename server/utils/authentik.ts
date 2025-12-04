import {
  AdminApi,
  Configuration,
  CoreApi,
  ProvidersApi,
  type BaseAPI,
} from "@goauthentik/api";
import type { H3Event } from "h3";

let configInstance: Configuration | null = null;

function useConfig(event?: H3Event) {
  if (!configInstance) {
    const { authentikBaseUrl, authentikAccessToken } = useRuntimeConfig(event);
    configInstance = new Configuration({
      basePath: `${authentikBaseUrl}api/v3`,
      accessToken: authentikAccessToken,
    });
  }
  return configInstance;
}

function buildComposable<T extends BaseAPI>(
  constructor: new (config: Configuration) => T,
) {
  let instance: T | null = null;
  return (event?: H3Event): T => {
    if (!instance) {
      const config = useConfig(event);
      instance = new constructor(config);
    }
    return instance;
  };
}

export const useAuthentikAdminApi = buildComposable(AdminApi);

export const useAuthentikCoreApi = buildComposable(CoreApi);

export const useAuthentikProvidersApi = buildComposable(ProvidersApi);
