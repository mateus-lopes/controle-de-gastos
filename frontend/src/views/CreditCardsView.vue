<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useMonthStore } from "../stores/month";
import { api } from "../services/api";
import MonthNavigator from "../components/MonthNavigator.vue";

const monthStore = useMonthStore();

interface CardInvoice {
  card: { id: number; name: string };
  month: number;
  year: number;
  amount: string;
  paid: boolean;
}

const invoices = ref<CardInvoice[]>([]);
const loading = ref(false);
const showForm = ref(false);
const saving = ref(false);
const newCardName = ref("");

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<CardInvoice[]>("/credit-cards/invoices", {
      params: { month: monthStore.month, year: monthStore.year },
    });
    invoices.value = data;
  } finally {
    loading.value = false;
  }
}

async function togglePaid(cardId: number) {
  await api.patch(`/credit-cards/${cardId}/invoice`, {
    month: monthStore.month,
    year: monthStore.year,
  });
  await load();
}

async function addCard() {
  if (!newCardName.value.trim()) return;
  saving.value = true;
  try {
    await api.post("/credit-cards", { name: newCardName.value });
    newCardName.value = "";
    showForm.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function removeCard(id: number) {
  if (!confirm("Remover este cartão e todas as faturas?")) return;
  await api.delete(`/credit-cards/${id}`);
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
        <h2>Cartões de Crédito</h2>
        <button class="btn btn-primary" @click="showForm = !showForm">+ Novo</button>
      </div>
    </header>

    <div v-if="showForm" class="card form-card">
      <div class="form-group">
        <label>Nome do cartão</label>
        <input v-model="newCardName" type="text" placeholder="Ex: Nubank" autofocus />
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" @click="showForm = false">Cancelar</button>
        <button class="btn btn-primary" :disabled="saving" @click="addCard">Salvar</button>
      </div>
    </div>

    <div v-if="loading" class="empty-state"><p>Carregando...</p></div>
    <div v-else-if="invoices.length === 0 && !showForm" class="empty-state">
      <p>Nenhum cartão cadastrado</p>
    </div>
    <template v-else>
      <div v-for="inv in invoices" :key="inv.card.id" class="card invoice-card">
        <div class="invoice-main">
          <span class="card-name">{{ inv.card.name }}</span>
          <span class="invoice-amount" :class="parseFloat(inv.amount) > 0 ? 'amount-negative' : ''">
            {{ fmt(inv.amount) }}
          </span>
        </div>
        <div class="invoice-footer">
          <button
            class="btn"
            :class="inv.paid ? 'btn-ghost' : 'btn-primary'"
            @click="togglePaid(inv.card.id)"
          >
            {{ inv.paid ? "✓ Pago" : "Marcar como pago" }}
          </button>
          <button class="icon-btn" @click="removeCard(inv.card.id)">Remover</button>
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

.invoice-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invoice-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-name {
  font-size: 1rem;
  font-weight: 600;
}

.invoice-amount {
  font-size: 1.25rem;
  font-weight: 700;
}

.invoice-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.invoice-footer .btn {
  flex: 1;
  padding: 10px;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.8rem;
  padding: 4px;
}

.icon-btn:hover {
  color: var(--danger);
}
</style>
