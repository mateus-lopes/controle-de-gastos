<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useMonthStore } from "../stores/month";
import { api } from "../services/api";
import MonthNavigator from "../components/MonthNavigator.vue";

const monthStore = useMonthStore();

interface FixedExpense {
  id: number;
  description: string;
  amount: string;
  paid: boolean;
}

const expenses = ref<FixedExpense[]>([]);
const loading = ref(false);
const showForm = ref(false);
const formData = ref({ description: "", amount: "" });
const saving = ref(false);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<FixedExpense[]>("/expenses/fixed", {
      params: { month: monthStore.month, year: monthStore.year },
    });
    expenses.value = data;
  } finally {
    loading.value = false;
  }
}

async function togglePaid(id: number) {
  await api.patch(`/expenses/fixed/${id}/payment`, {
    month: monthStore.month,
    year: monthStore.year,
  });
  await load();
}

async function save() {
  if (!formData.value.description || !formData.value.amount) return;
  saving.value = true;
  try {
    await api.post("/expenses/fixed", {
      description: formData.value.description,
      amount: parseFloat(formData.value.amount),
    });
    formData.value = { description: "", amount: "" };
    showForm.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(id: number) {
  if (!confirm("Remover esta saída fixa?")) return;
  await api.delete(`/expenses/fixed/${id}`);
  await load();
}

function fmt(v: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

onMounted(load);
watch([() => monthStore.month, () => monthStore.year], load);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <MonthNavigator />
      <div class="header-actions">
        <h2>Saídas Fixas</h2>
        <button class="btn btn-primary" @click="showForm = !showForm">+ Nova</button>
      </div>
    </header>

    <div v-if="showForm" class="card form-card">
      <div class="form-group">
        <label>Descrição</label>
        <input v-model="formData.description" type="text" placeholder="Ex: Aluguel" />
      </div>
      <div class="form-group">
        <label>Valor (R$)</label>
        <input v-model="formData.amount" type="number" step="0.01" min="0" />
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" @click="showForm = false">Cancelar</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? "Salvando..." : "Salvar" }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty-state"><p>Carregando...</p></div>
    <div v-else-if="expenses.length === 0 && !showForm" class="empty-state">
      <p>Nenhuma saída fixa cadastrada</p>
    </div>
    <template v-else>
      <div v-for="exp in expenses" :key="exp.id" class="card row-item">
        <button
          class="check-btn"
          :class="{ checked: exp.paid }"
          @click="togglePaid(exp.id)"
        >
          {{ exp.paid ? "✓" : "" }}
        </button>
        <div class="item-info" :class="{ 'item-paid': exp.paid }">
          <span class="item-name">{{ exp.description }}</span>
          <span class="item-amount">{{ fmt(exp.amount) }}</span>
        </div>
        <button class="icon-btn" @click="remove(exp.id)">✕</button>
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

.header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.header-actions h2 {
  font-size: 1.1rem;
  font-weight: 600;
}

.form-card {
  margin-bottom: 12px;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.form-actions .btn {
  flex: 1;
}

.row-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.check-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: none;
  color: var(--success);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s;
}

.check-btn.checked {
  border-color: var(--success);
  background: rgba(34, 197, 94, 0.15);
}

.item-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 8px;
}

.item-info.item-paid .item-name {
  text-decoration: line-through;
  color: var(--text-muted);
}

.item-name {
  font-size: 0.95rem;
}

.item-amount {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 4px;
  flex-shrink: 0;
}

.icon-btn:hover {
  color: var(--danger);
}
</style>
