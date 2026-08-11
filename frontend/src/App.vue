<script setup lang="ts">
import { useAuthStore } from "./stores/auth";
import { useIsDesktop } from "./composables/useBreakpoint";
import BottomNav from "./components/BottomNav.vue";
import FloatingAddButton from "./components/FloatingAddButton.vue";
import DesktopLayout from "./layouts/DesktopLayout.vue";
import Toast from "./components/ui/Toast.vue";
import OfflineBanner from "./components/OfflineBanner.vue";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt.vue";

const auth = useAuthStore();
const isDesktop = useIsDesktop();
</script>

<template>
  <OfflineBanner />
  <Toast />
  <template v-if="isDesktop && auth.isAuthenticated">
    <DesktopLayout />
  </template>
  <template v-else>
    <RouterView />
    <template v-if="auth.isAuthenticated">
      <BottomNav />
      <PwaUpdatePrompt />
    </template>
  </template>
  <FloatingAddButton v-if="auth.isAuthenticated" />
</template>
