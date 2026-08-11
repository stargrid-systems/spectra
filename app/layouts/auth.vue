<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-8 p-4">
    <div class="flex flex-col items-center gap-1 text-center">
      <img src="/favicon.svg" alt="" class="h-10 w-10" />
      <h1 class="text-xl font-semibold">{{ $t("app.name") }}</h1>
      <p class="text-muted text-sm">{{ $t("app.description") }}</p>
    </div>
    <div class="w-full max-w-sm">
      <slot />
    </div>
  </div>
</template>
