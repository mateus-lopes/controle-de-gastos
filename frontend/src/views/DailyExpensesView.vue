<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useMonthStore } from "../stores/month";
import { api } from "../services/api";
import MonthNavigator from "../components/MonthNavigator.vue";

const monthStore = useMonthStore();

interface Expense {
  id: number;
  description: string;
  amount: string;
  date: string;
  paymentMethod: string;
  creditCardId: number | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
}

interface Category {
  id: number;
  name: string;
}

const expenses = ref<Expense[]>([]);
const categories = ref<Category[]>([]);
const filterCategory = ref("");
const filterMethod = ref("");
const loading = ref(false);
const showForm = ref(false);
const editing = ref<Expense | null>(null);

async function load() {
  loading.value = true;
  try {
    const params: Record<string, string | number> = { month: monthStore.month, year: monthStore.year };
    if (filterCategory.value) params.categoryId = filterCategory.value;
    if (filterMethod.value) params.paymentMethod = filterMethod.value;
    const { data } = await api.get<Expense[]>("/daily-expenses", { params });
    expenses.value = data;
  } finally {
    loading.value = false;
  }
}

async function loadCategories() {
  const { data } = await api.get<Category[]>("/categories");
  categories.value = data;
}

async function remove(id: number) {
  if (!confirm("Remover este gasto?")) return;
  await api.delete(`/daily-expenses/${id}`);
  await load();
}

function fmt(v: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

const METHOD_LABELS: Record<string, string> = {
  debit: "Débito",
  credit: "Crédito",
  credit_card: "Cartão",
  cash: "Dinheiro",
};

onMounted(async () => {
  await Promise.all([load(), loadCategories()]);
});

watch([() => monthStore.month, () => monthStore.year, filterCategory, filterMethod], load);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <MonthNavigator />
      <div class="filters">
        <select v-model="filterCategory" class="filter-select">
          <option value="">Todas categorias</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <select v-model="filterMethod" class="filter-select">
          <option value="">Todas formas</option>
          <option value="debit">Débito</option>
          <option value="credit">Crédito</option>
          <option value="credit_card">Cartão</option>
          <option value="cash">Dinheiro</option>
        </select>
      </div>
    </header>

    <div v-if="loading" class="empty-state"><p>Carregando...</p></div>
    <div v-else-if="expenses.length === 0" class="empty-state">
      <span style="font-size: 2rem">🧾</span>
      <p>Nenhum gasto registrado</p>
    </div>
    <template v-else>
      <div v-for="exp in expenses" :key="exp.id" class="card expense-item">
        <div class="exp-left">
          <div
            class="cat-dot"
            :style="{ background: exp.categoryColor ?? '#475569' }"
          />
          <div class="exp-info">
            <span class="exp-desc">{{ exp.description }}</span>
            <span class="exp-meta">
              {{ exp.date }} · {{ METHOD_LABELS[exp.paymentMethod] }}
              <span v-if="exp.categoryName"> · {{ exp.categoryName }}</span>
            </span>
          </div>
        </div>
        <div class="exp-right">
          <span class="exp-amount amount-negative">{{ fmt(exp.amount) }}</span>
          <button class="icon-btn" @click="remove(exp.id)">✕</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-header {
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  padding: 12px 0 16px;
  z-index: 10;
}

.filters {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.filter-select {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
}

.expense-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.exp-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.cat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.exp-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.exp-desc {
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exp-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.exp-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.exp-amount {
  font-size: 0.95rem;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}

.icon-btn:hover {
  color: var(--danger);
}
</style>
