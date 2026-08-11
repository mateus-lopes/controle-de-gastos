<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useMonthStore } from "../stores/month";
import { api } from "../services/api";
import MonthNavigator from "../components/MonthNavigator.vue";

const monthStore = useMonthStore();

interface Installment {
  id: number;
  description: string;
  amount: string;
  installmentNumber: number;
  totalInstallments: number;
  paid: boolean;
}

const installments = ref<Installment[]>([]);
const loading = ref(false);
const showForm = ref(false);
const saving = ref(false);
const formData = ref({
  description: "",
  amount: "",
  currentInstallment: "1",
  totalInstallments: "",
  currentMonth: String(new Date().getMonth() + 1),
  currentYear: String(new Date().getFullYear()),
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<Installment[]>("/installments", {
      params: { month: monthStore.month, year: monthStore.year },
    });
    installments.value = data;
  } finally {
    loading.value = false;
  }
}

async function togglePaid(id: number) {
  await api.patch(`/installments/${id}/payment`, {
    month: monthStore.month,
    year: monthStore.year,
  });
  await load();
}

async function save() {
  saving.value = true;
  try {
    await api.post("/installments", {
      description: formData.value.description,
      amount: parseFloat(formData.value.amount),
      currentInstallment: parseInt(formData.value.currentInstallment),
      totalInstallments: parseInt(formData.value.totalInstallments),
      currentMonth: parseInt(formData.value.currentMonth),
      currentYear: parseInt(formData.value.currentYear),
    });
    showForm.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(id: number) {
  if (!confirm("Remover esta parcela?")) return;
  await api.delete(`/installments/${id}`);
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
        <h2>Parcelas</h2>
        <button class="btn btn-primary" @click="showForm = !showForm">+ Nova</button>
      </div>
    </header>

    <div v-if="showForm" class="card form-card">
      <div class="form-group">
        <label>Descrição</label>
        <input v-model="formData.description" type="text" placeholder="Ex: iPhone" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor da parcela</label>
          <input v-model="formData.amount" type="number" step="0.01" min="0" />
        </div>
        <div class="form-group">
          <label>Parcela atual</label>
          <input v-model="formData.currentInstallment" type="number" min="1" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Total de parcelas</label>
          <input v-model="formData.totalInstallments" type="number" min="1" />
        </div>
        <div class="form-group">
          <label>Mês atual</label>
          <input v-model="formData.currentMonth" type="number" min="1" max="12" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" @click="showForm = false">Cancelar</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? "Salvando..." : "Salvar" }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty-state"><p>Carregando...</p></div>
    <div v-else-if="installments.length === 0 && !showForm" class="empty-state">
      <p>Nenhuma parcela ativa este mês</p>
    </div>
    <template v-else>
      <div v-for="inst in installments" :key="inst.id" class="card row-item">
        <button
          class="check-btn"
          :class="{ checked: inst.paid }"
          @click="togglePaid(inst.id)"
        >
          {{ inst.paid ? "✓" : "" }}
        </button>
        <div class="item-info" :class="{ 'item-paid': inst.paid }">
          <div class="item-name-row">
            <span class="item-name">{{ inst.description }}</span>
            <span class="parcel-badge">{{ inst.installmentNumber }}/{{ inst.totalInstallments }}</span>
          </div>
          <span class="item-amount">{{ fmt(inst.amount) }}</span>
        </div>
        <button class="icon-btn" @click="remove(inst.id)">✕</button>
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

.item-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-name {
  font-size: 0.95rem;
}

.parcel-badge {
  font-size: 0.7rem;
  background: var(--bg-card-hover);
  padding: 1px 6px;
  border-radius: 99px;
  color: var(--text-muted);
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
</style>
