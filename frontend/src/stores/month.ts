import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useMonthStore = defineStore("month", () => {
  const now = new Date();
  const month = ref(now.getMonth() + 1);
  const year = ref(now.getFullYear());

  const label = computed(() =>
    new Date(year.value, month.value - 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    })
  );

  function prev() {
    if (month.value === 1) {
      month.value = 12;
      year.value--;
    } else {
      month.value--;
    }
  }

  function next() {
    if (month.value === 12) {
      month.value = 1;
      year.value++;
    } else {
      month.value++;
    }
  }

  return { month, year, label, prev, next };
});
