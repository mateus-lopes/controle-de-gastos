<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useMonthStore } from "../stores/month";
import { api } from "../services/api";
import MonthNavigator from "../components/MonthNavigator.vue";

const monthStore = useMonthStore();

interface Investment {
  id: number;
  name: string;
  type: string;
  monthlyAmount: string;
  goalAmount: string | null;
  currentAmount: string | null;
  showProgress: boolean;
  paid: boolean;
}

const investments = ref<Investment[]>([]);
const loading = ref(false);
const showForm = ref(false);
const saving = ref(false);
const form = ref({
  name: "",
  type: "savings",
  monthlyAmount: "",
  goalAmount: "",
  currentAmount: "",
  showProgress: false,
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<Investment[]>("/investments", {
      params: { month: monthStore.month, year: monthStore.year },
    });
    investments.value = data;
  } finally {
    loading.value = false;
  }
}

async function toggleContribution(id: number) {
  await api.patch(`/investments/${id}/contribution`, {
    month: monthStore.month,
    year: monthStore.year,
  });
  await load();
}

async function save() {
  saving.value = true;
  try {
    await api.post("/investments", {
      name: form.value.name,
      type: form.value.type,
      monthlyAmount: parseFloat(form.value.monthlyAmount),
      goalAmount: form.value.goalAmount ? parseFloat(form.value.goalAmount) : undefined,
      currentAmount: form.value.currentAmount ? parseFloat(form.value.currentAmount) : undefined,
      showProgress: form.value.showProgress,
    });
    showForm.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(id: number) {
  if (!confirm("Remover este investimento?")) return;
  await api.delete(`/investments/${id}`);
  await load();
}

function fmt(v: string | number | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}

function progress(current: string | null, goal: string | null) {
  if (!current || !goal || parseFloat(goal) === 0) return 0;
  return Math.min(100, (parseFloat(current) / parseFloat(goal)) * 100);
}

onMounted(load);
watch([() => monthStore.month, () => monthStore.year], load);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <MonthNavigator />
      <div class="header-actions">
        <h2>Investimentos</h2>
        <button class="btn btn-primary" @click="showForm = !showForm">+ Novo</button>
      </div>
    </header>

    <div v-if="showForm" class="card form-card">
      <div class="form-group">
        <label>Nome</label>
        <input v-model="form.name" type="text" placeholder="Ex: Nubank" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Tipo</label>
          <select v-model="form.type">
            <option value="savings">Poupança</option>
            <option value="property">Imóvel</option>
            <option value="stock">Ações</option>
            <option value="crypto">Cripto</option>
            <option value="other">Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label>Aporte mensal</label>
          <input v-model="form.monthlyAmount" type="number" step="0.01" min="0" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Meta total (opcional)</label>
          <input v-model="form.goalAmount" type="number" step="0.01" min="0" />
        </div>
        <div class="form-group">
          <label>Valor atual (opcional)</label>
          <input v-model="form.currentAmount" type="number" step="0.01" min="0" />
        </div>
      </div>
      <label class="toggle-label">
        <input v-model="form.showProgress" type="checkbox" />
        Mostrar barra de progresso
      </label>
      <div class="form-actions" style="margin-top: 16px">
        <button class="btn btn-ghost" @click="showForm = false">Cancelar</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">Salvar</button>
      </div>
    </div>

    <div v-if="loading" class="empty-state"><p>Carregando...</p></div>
    <div v-else-if="investments.length === 0 && !showForm" class="empty-state">
      <p>Nenhum investimento cadastrado</p>
    </div>
    <template v-else>
      <div v-for="inv in investments" :key="inv.id" class="card invest-card">
        <div class="invest-header">
          <div>
            <span class="invest-name">{{ inv.name }}</span>
            <span class="invest-type">{{ inv.type }}</span>
          </div>
          <button class="icon-btn" @click="remove(inv.id)">✕</button>
        </div>
        <div class="invest-monthly">
          <span class="monthly-label">Aporte mensal</span>
          <button
            class="btn"
            :class="inv.paid ? 'btn-ghost' : 'btn-primary'"
            style="padding: 6px 14px; font-size: 0.875rem"
            @click="toggleContribution(inv.id)"
          >
            {{ inv.paid ? "✓ " : "" }}{{ fmt(inv.monthlyAmount) }}
          </button>
        </div>
        <template v-if="inv.showProgress && inv.goalAmount">
          <div class="progress-bar-bg" style="margin-top: 12px">
            <div
              class="progress-bar-fill"
              :style="{ width: `${progress(inv.currentAmount, inv.goalAmount)}%` }"
            />
          </div>
          <div class="progress-labels">
            <span>{{ fmt(inv.currentAmount) }}</span>
            <span>Meta: {{ fmt(inv.goalAmount) }}</span>
          </div>
        </template>
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.form-actions .btn {
  flex: 1;
}

.invest-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.invest-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.invest-name {
  font-size: 1rem;
  font-weight: 600;
  display: block;
}

.invest-type {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: capitalize;
}

.invest-monthly {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.monthly-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.progress-bar-bg {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 4px;
}

.icon-btn:hover {
  color: var(--danger);
}
</style>
