import {
  type Application,
  type Provider,
  ResponseError,
} from "@goauthentik/api";

const appDetails = {
  name: "Spectra",
  slug: "spectra",
} as const;

export default defineTask({
  meta: {
    name: "authentik:migrate",
  },
  async run() {
    const app = await upsertApplication();
    console.log(app);

    return { result: null };
  },
});

function isNotFoundError(err: unknown): boolean {
  return err instanceof ResponseError && err.response.status === 404;
}

async function upsertProvider() {
  const providersApi = useAuthentikProvidersApi();

  let provider;
  try {
    provider = await providersApi.providersOauth2Retrieve({});
  } catch (err) {
    if (isNotFoundError(err)) {
      provider = null;
    } else {
      throw err;
    }
  }

  // TODO
  throw new Error("Not implemented");
}

async function upsertApplication() {
  const coreApi = useAuthentikCoreApi();

  let app;
  try {
    app = await coreApi.coreApplicationsRetrieve({
      slug: appDetails.slug,
    });
  } catch (err) {
    if (isNotFoundError(err)) {
      app = null;
    } else {
      throw err;
    }
  }

  if (!app) {
    console.info(`Creating authentik application '${appDetails.slug}'`);
    return await coreApi.coreApplicationsCreate({
      applicationRequest: {
        ...appDetails,
      },
    });
  }

  // TODO: Update existing application if needed
  return app;
}
