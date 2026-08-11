<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useMonthStore } from "../stores/month";
import { api } from "../services/api";
import MonthNavigator from "../components/MonthNavigator.vue";

const monthStore = useMonthStore();

interface FixedIncome { id: number; description: string; amount: string; active: boolean }
interface VariableIncome { id: number; description: string; amount: string; date: string }

const tab = ref<"fixed" | "variable">("fixed");
const fixedList = ref<FixedIncome[]>([]);
const variableList = ref<VariableIncome[]>([]);
const loading = ref(false);
const showForm = ref(false);
const saving = ref(false);
const fixedForm = ref({ description: "", amount: "" });
const varForm = ref({ description: "", amount: "", date: new Date().toISOString().slice(0, 10) });

async function load() {
  loading.value = true;
  try {
    const [fixed, variable] = await Promise.all([
      api.get<FixedIncome[]>("/incomes/fixed"),
      api.get<VariableIncome[]>("/incomes/variable", { params: { month: monthStore.month, year: monthStore.year } }),
    ]);
    fixedList.value = fixed.data;
    variableList.value = variable.data;
  } finally {
    loading.value = false;
  }
}

async function saveFixed() {
  saving.value = true;
  try {
    await api.post("/incomes/fixed", { description: fixedForm.value.description, amount: parseFloat(fixedForm.value.amount) });
    fixedForm.value = { description: "", amount: "" };
    showForm.value = false;
    await load();
  } finally { saving.value = false; }
}

async function saveVariable() {
  saving.value = true;
  try {
    await api.post("/incomes/variable", { description: varForm.value.description, amount: parseFloat(varForm.value.amount), date: varForm.value.date });
    varForm.value = { description: "", amount: "", date: new Date().toISOString().slice(0, 10) };
    showForm.value = false;
    await load();
  } finally { saving.value = false; }
}

async function removeFixed(id: number) {
  if (!confirm("Remover?")) return;
  await api.delete(`/incomes/fixed/${id}`);
  await load();
}

async function removeVariable(id: number) {
  if (!confirm("Remover?")) return;
  await api.delete(`/incomes/variable/${id}`);
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
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'fixed' }" @click="tab = 'fixed'; showForm = false">Fixas</button>
        <button class="tab" :class="{ active: tab === 'variable' }" @click="tab = 'variable'; showForm = false">Variáveis</button>
      </div>
      <div class="header-actions">
        <h2>Entradas {{ tab === "fixed" ? "Fixas" : "Variáveis" }}</h2>
        <button class="btn btn-primary" @click="showForm = !showForm">+ Nova</button>
      </div>
    </header>

    <template v-if="tab === 'fixed'">
      <div v-if="showForm" class="card form-card">
        <div class="form-group">
          <label>Descrição</label>
          <input v-model="fixedForm.description" type="text" placeholder="Ex: Salário" />
        </div>
        <div class="form-group">
          <label>Valor (R$)</label>
          <input v-model="fixedForm.amount" type="number" step="0.01" min="0" />
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="showForm = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="saving" @click="saveFixed">Salvar</button>
        </div>
      </div>
      <div v-if="loading" class="empty-state"><p>Carregando...</p></div>
      <div v-else-if="fixedList.length === 0 && !showForm" class="empty-state"><p>Nenhuma entrada fixa</p></div>
      <div v-for="item in fixedList" :key="item.id" class="card row-item">
        <div class="item-info">
          <span>{{ item.description }}</span>
          <span class="amount-positive">{{ fmt(item.amount) }}</span>
        </div>
        <button class="icon-btn" @click="removeFixed(item.id)">✕</button>
      </div>
    </template>

    <template v-else>
      <div v-if="showForm" class="card form-card">
        <div class="form-group">
          <label>Descrição</label>
          <input v-model="varForm.description" type="text" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Valor (R$)</label>
            <input v-model="varForm.amount" type="number" step="0.01" min="0" />
          </div>
          <div class="form-group">
            <label>Data</label>
            <input v-model="varForm.date" type="date" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="showForm = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="saving" @click="saveVariable">Salvar</button>
        </div>
      </div>
      <div v-if="loading" class="empty-state"><p>Carregando...</p></div>
      <div v-else-if="variableList.length === 0 && !showForm" class="empty-state"><p>Nenhuma entrada variável</p></div>
      <div v-for="item in variableList" :key="item.id" class="card row-item">
        <div class="item-info">
          <span class="item-desc">{{ item.description }} <small>{{ item.date }}</small></span>
          <span class="amount-positive">{{ fmt(item.amount) }}</span>
        </div>
        <button class="icon-btn" @click="removeVariable(item.id)">✕</button>
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

.tabs {
  display: flex;
  gap: 4px;
  margin-top: 12px;
  background: var(--bg-card);
  border-radius: 8px;
  padding: 4px;
}

.tab {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.tab.active {
  background: var(--accent);
  color: #fff;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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

.item-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 8px;
}

.item-desc small {
  color: var(--text-muted);
  font-size: 0.8em;
  margin-left: 4px;
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
