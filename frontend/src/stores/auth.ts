import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../services/api";

interface User {
  id: number;
  name: string;
  email: string;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const isAuthenticated = ref(false);
  const sessionChecked = ref(false);

  async function checkSession() {
    try {
      const { data } = await api.get<{ user: User }>("/auth/me");
      user.value = data.user;
      isAuthenticated.value = true;
    } catch {
      user.value = null;
      isAuthenticated.value = false;
    } finally {
      sessionChecked.value = true;
    }
  }

  async function login(email: string, password: string) {
    const { data } = await api.post<{ user: User }>("/auth/login", { email, password });
    user.value = data.user;
    isAuthenticated.value = true;
  }

  async function logout() {
    await api.post("/auth/logout");
    user.value = null;
    isAuthenticated.value = false;
  }

  return { user, isAuthenticated, sessionChecked, checkSession, login, logout };
});
