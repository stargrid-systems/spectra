<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import type {
  ArtifactSummary,
  ArtifactVersion,
  ListArtifactsParams,
  ListArtifactVersionsParams,
} from "~~/modules/aperture/runtime/types";
import {
  ARTIFACT_SORTS,
  artifactsParamsFromFilters,
  useArtifactsFilters,
  useArtifactVersionsFilters,
  versionsParamsFromFilters,
} from "~/composables/useArtifactsFilters";
import { bytesToUnit } from "~/utils/formatBytes";

const { t } = useI18n();
const toast = useToast();
const fmt = useFormatter();
const localePath = useLocalePath();

const filters = useArtifactsFilters();
const versionFilters = useArtifactVersionsFilters();

function formatTimestamp(ts: Temporal.Instant): string {
  return fmt.date(ts, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatBytes(bytes: number): string {
  const { value, unit } = bytesToUnit(bytes);
  return fmt.unit(value, unit as Parameters<typeof fmt.unit>[1], { unitDisplay: "short" });
}

function shortDigest(digest: string): string {
  return digest.length > 19 ? `${digest.slice(0, 19)}...` : digest;
}

// List view.

const listParams = computed(() => artifactsParamsFromFilters(filters));

const {
  items: artifacts,
  pending: listPending,
  error: listError,
  hasNext: listHasNext,
  hasPrev: listHasPrev,
  loadNext: listLoadNext,
  loadPrev: listLoadPrev,
  reload: listReload,
} = useCursorPager<ArtifactSummary, ListArtifactsParams>(
  (query) => apertureApi.listArtifacts(query),
  () => listParams.value,
);

const selectedKey = computed(() => filters.key);

// Versions view.

const versionsParams = computed<ListArtifactVersionsParams>(() =>
  versionsParamsFromFilters(versionFilters),
);

const {
  items: versions,
  pending: versionsPending,
  error: versionsError,
  hasNext: versionsHasNext,
  hasPrev: versionsHasPrev,
  loadNext: versionsLoadNext,
  loadPrev: versionsLoadPrev,
  reload: versionsReload,
} = useCursorPager<ArtifactVersion, ListArtifactVersionsParams>(
  (query) => apertureApi.listArtifactVersions(selectedKey.value ?? "", query),
  () => (selectedKey.value ? versionsParams.value : undefined),
);

const SORT_LABEL_KEYS = {
  downloaded_at: "downloadedAt",
  size_bytes: "sizeBytes",
} as const;

const sortItems = computed<SelectMenuItem[]>(() => [
  { label: t("operations.artifacts.sort.default"), value: undefined },
  ...ARTIFACT_SORTS.map((s) => ({
    label: t(`operations.artifacts.sort.${SORT_LABEL_KEYS[s]}`),
    value: s,
  })),
]);

async function onEvict(version: ArtifactVersion) {
  if (!selectedKey.value) return;
  try {
    await apertureApi.deleteArtifactVersion(selectedKey.value, version.digest);
    await versionsReload();
    toast.add({ title: t("operations.artifacts.evicted"), color: "success" });
  } catch (err) {
    toast.add({
      title:
        err instanceof ApiError && err.status === 404
          ? t("operations.artifacts.evictMissing")
          : t("operations.artifacts.evictFailed"),
      color: "error",
    });
  }
}

function downloadName(version: ArtifactVersion): string {
  if (version.version) return version.version;
  return version.digest.replace(":", "-");
}

// Upload modal.

const uploadOpen = ref(false);
const uploadKey = ref("");
const uploadFile = ref<File | null>(null);
const uploading = ref(false);

function openUpload(key?: string) {
  uploadKey.value = key ?? "";
  uploadFile.value = null;
  uploadOpen.value = true;
}

function onUploadFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  uploadFile.value = target.files?.[0] ?? null;
}

async function onUpload() {
  if (!uploadKey.value.trim() || !uploadFile.value) return;
  uploading.value = true;
  try {
    await apertureApi.uploadArtifact(uploadKey.value.trim(), uploadFile.value);
    uploadOpen.value = false;
    toast.add({ title: t("operations.artifacts.uploaded"), color: "success" });
    if (selectedKey.value && selectedKey.value === uploadKey.value.trim()) {
      await Promise.all([versionsReload(), listReload()]);
    } else {
      await listReload();
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 413) {
      toast.add({ title: t("operations.artifacts.tooLarge"), color: "error" });
    } else {
      toast.add({ title: t("operations.artifacts.uploadFailed"), color: "error" });
    }
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <AppPage :title="$t('operations.artifacts.title')">
    <template #toolbar>
      <div class="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-default">
        <template v-if="!selectedKey">
          <UInput
            v-model="filters.q"
            :placeholder="$t('operations.artifacts.search')"
            icon="i-lucide-search"
            size="sm"
            class="w-56"
          />
        </template>
        <template v-else>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            :label="$t('operations.artifacts.backToList')"
            @click="filters.key = undefined"
          />
          <span class="font-mono text-sm truncate">{{ selectedKey }}</span>
          <UInput
            v-model="versionFilters.media_type"
            :placeholder="$t('operations.artifacts.filters.mediaType')"
            size="sm"
            class="w-56"
          />
          <UInput
            v-model="versionFilters.version"
            :placeholder="$t('operations.artifacts.filters.version')"
            size="sm"
            class="w-36"
          />
          <USelectMenu
            v-model="versionFilters.sort"
            :items="sortItems"
            value-key="value"
            size="sm"
            class="w-44"
            :aria-label="$t('operations.artifacts.filters.sort')"
          />
        </template>

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          size="sm"
          :label="$t('operations.artifacts.refresh')"
          class="ms-auto"
          @click="selectedKey ? versionsReload() : listReload()"
        />
        <UButton
          icon="i-lucide-upload"
          size="sm"
          :label="$t('operations.artifacts.upload')"
          @click="openUpload(selectedKey)"
        />
      </div>
    </template>

    <div class="p-4">
      <DataState
        v-if="!selectedKey"
        :pending="listPending && artifacts.length === 0"
        :error="listError ? String(listError) : null"
        :empty="artifacts.length === 0"
        :empty-text="$t('operations.artifacts.empty')"
        :error-text="$t('operations.artifacts.error')"
        :retry-text="$t('common.retry')"
        @retry="listReload()"
      >
        <div class="flex flex-col gap-2">
          <UPageCard
            v-for="artifact in artifacts"
            :key="artifact.key"
            variant="subtle"
            :to="localePath({ path: '/operations/artifacts', query: { key: artifact.key } })"
          >
            <div class="flex flex-wrap sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <UIcon name="i-lucide-package" class="size-4 text-muted shrink-0" />
                <span class="font-mono text-sm truncate">{{ artifact.key }}</span>
                <UBadge
                  :label="$t('operations.artifacts.versionCount', { n: artifact.version_count })"
                  variant="subtle"
                />
              </div>
              <div class="flex items-center gap-3 text-xs text-muted">
                <span v-if="artifact.version" class="font-mono">{{ artifact.version }}</span>
                <span class="font-mono" :title="artifact.digest">
                  {{ shortDigest(artifact.digest) }}
                </span>
                <span>{{ formatBytes(artifact.size_bytes) }}</span>
                <span>{{ formatTimestamp(artifact.downloaded_at) }}</span>
              </div>
            </div>
          </UPageCard>
        </div>

        <PagerBar
          :has-prev="listHasPrev"
          :has-next="listHasNext"
          :pending="listPending && artifacts.length === 0"
          :prev-text="$t('common.prev')"
          :next-text="$t('common.next')"
          @prev="listLoadPrev()"
          @next="listLoadNext()"
        />
      </DataState>

      <DataState
        v-else
        :pending="versionsPending && versions.length === 0"
        :error="versionsError ? String(versionsError) : null"
        :empty="versions.length === 0"
        :empty-text="$t('operations.artifacts.noVersions')"
        :error-text="$t('operations.artifacts.error')"
        :retry-text="$t('common.retry')"
        @retry="versionsReload()"
      >
        <div class="flex flex-col gap-2">
          <UPageCard v-for="version in versions" :key="version.digest" variant="subtle">
            <div class="flex flex-wrap sm:items-center justify-between gap-3">
              <div class="flex flex-col min-w-0">
                <span class="font-mono text-xs" :title="version.digest">
                  {{ version.digest }}
                </span>
                <span class="text-muted text-xs">
                  <template v-if="version.version">{{ version.version }} / </template>
                  <template v-if="version.media_type">{{ version.media_type }} / </template>
                  {{ formatBytes(version.size_bytes) }}
                </span>
              </div>
              <div class="flex items-center gap-3 text-xs text-muted">
                <span>{{ formatTimestamp(version.downloaded_at) }}</span>
                <span v-if="version.verified_at">
                  {{ $t("operations.artifacts.verified") }}:
                  {{ formatTimestamp(version.verified_at) }}
                </span>
                <UButton
                  icon="i-lucide-download"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :label="$t('operations.artifacts.download')"
                  :to="artifactBlobUrl(selectedKey, version.digest)"
                  :download="downloadName(version)"
                  external
                />
                <UButton
                  icon="i-lucide-trash"
                  color="error"
                  variant="ghost"
                  size="xs"
                  :aria-label="$t('operations.artifacts.evict')"
                  @click="onEvict(version)"
                />
              </div>
            </div>
          </UPageCard>
        </div>

        <PagerBar
          :has-prev="versionsHasPrev"
          :has-next="versionsHasNext"
          :pending="versionsPending && versions.length === 0"
          :prev-text="$t('common.prev')"
          :next-text="$t('common.next')"
          @prev="versionsLoadPrev()"
          @next="versionsLoadNext()"
        />
      </DataState>
    </div>

    <UModal v-model:open="uploadOpen" :title="$t('operations.artifacts.upload')">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField :label="$t('operations.artifacts.key')" name="key">
            <UInput v-model="uploadKey" :disabled="!!selectedKey" class="w-full font-mono" />
          </UFormField>

          <UFormField :label="$t('operations.artifacts.file')" name="file">
            <UInput type="file" class="w-full" @change="onUploadFileChange" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" :label="$t('common.cancel')" @click="uploadOpen = false" />
            <UButton
              :loading="uploading"
              :label="$t('operations.artifacts.upload')"
              :disabled="!uploadKey.trim() || !uploadFile"
              @click="onUpload()"
            />
          </div>
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
