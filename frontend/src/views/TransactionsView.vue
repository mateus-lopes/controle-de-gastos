<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useMonthStore } from "../stores/month";
import { useAccountsStore } from "../stores/accounts";
import { useToast } from "../composables/useToast";
import MonthNavigator from "../components/MonthNavigator.vue";
import Skeleton from "../components/ui/Skeleton.vue";
import Dialog from "../components/ui/Dialog.vue";
import Badge from "../components/ui/Badge.vue";
import api from "../services/api";

const monthStore = useMonthStore();
const accountsStore = useAccountsStore();
const { success, error } = useToast();

interface Transaction {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: string;
  date: string;
  description: string;
  fromAccount: { id: number; name: string; color: string | null } | null;
  toAccount: { id: number; name: string; color: string | null } | null;
  category: { id: number; name: string; color: string | null } | null;
}

const transactions = ref<Transaction[]>([]);
const carryOver = ref<number | null>(null);
const loading = ref(false);
const showDialog = ref(false);
const submitting = ref(false);

const form = ref({
  type: "expense" as "income" | "expense" | "transfer",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  fromAccountId: "",
  toAccountId: "",
});

const inputClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const selectClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer";

function prevMonthParams() {
  let m = monthStore.month - 1;
  let y = monthStore.year;
  if (m <= 0) { m += 12; y--; }
  return { month: m, year: y };
}

async function load() {
  loading.value = true;
  try {
    const prev = prevMonthParams();
    const [txRes, dashRes] = await Promise.all([
      api.get<Transaction[]>("/transactions", { params: { month: monthStore.month, year: monthStore.year } }),
      api.get<{ saldo: number }>("/dashboard", { params: { month: prev.month, year: prev.year } }),
    ]);
    transactions.value = txRes.data;
    carryOver.value = dashRes.data.saldo !== 0 ? dashRes.data.saldo : null;
  } finally { loading.value = false; }
}

onMounted(async () => { await Promise.all([load(), accountsStore.loadAccounts()]); });
watch([() => monthStore.month, () => monthStore.year], load);

function fmt(v: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function openNew() {
  form.value = { type: "expense", amount: "", date: new Date().toISOString().slice(0, 10), description: "", fromAccountId: "", toAccountId: "" };
  showDialog.value = true;
}

async function submit() {
  if (!form.value.amount || !form.value.description.trim()) return;
  submitting.value = true;
  try {
    await api.post("/transactions", {
      type: form.value.type,
      amount: parseFloat(form.value.amount),
      date: form.value.date,
      description: form.value.description,
      fromAccountId: form.value.fromAccountId ? parseInt(form.value.fromAccountId) : null,
      toAccountId: form.value.toAccountId ? parseInt(form.value.toAccountId) : null,
    });
    showDialog.value = false;
    await load();
    success("Transação criada");
  } catch { error("Erro ao criar transação"); }
  finally { submitting.value = false; }
}

async function remove(id: number) {
  try {
    await api.delete(`/transactions/${id}`);
    await load();
  } catch { error("Erro ao remover"); }
}

const typeIcon: Record<string, string> = {
  income: `<path d="M7 17L17 7M17 7H7M17 7v10"/>`,
  expense: `<path d="M17 7L7 17M7 17h10M7 17V7"/>`,
  transfer: `<path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>`,
};
const typeColor: Record<string, string> = {
  income: "bg-emerald-500/15 text-emerald-400",
  expense: "bg-rose-500/15 text-rose-400",
  transfer: "bg-blue-500/15 text-blue-400",
};
</script>

<template>
  <div class="page">
    <div class="flex items-center justify-between mb-5">
      <div class="lg:hidden"><MonthNavigator /></div>
      <button
        type="button"
        @click="openNew"
        class="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-auto"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <template v-if="loading">
      <Skeleton class="h-16 w-full mb-2" v-for="i in 5" :key="i" />
    </template>

    <template v-else-if="transactions.length || carryOver !== null">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <!-- Saldo anterior (carry-over) -->
        <div v-if="carryOver !== null" class="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-secondary/30">
          <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            :class="carryOver >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-foreground">Saldo do mês anterior</p>
            <p class="text-xs text-muted-foreground">Carry-over — atualiza automaticamente</p>
          </div>
          <span class="text-sm font-semibold" :class="carryOver >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ carryOver >= 0 ? '+' : '' }}{{ fmt(carryOver) }}
          </span>
        </div>

        <div
          v-for="(tx, i) in transactions"
          :key="tx.id"
          class="flex items-center gap-3 px-4 py-3 group"
          :class="{ 'border-t border-border': i > 0 }"
        >
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', typeColor[tx.type]]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="typeIcon[tx.type]" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-foreground truncate">{{ tx.description }}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span v-if="tx.fromAccount" class="text-xs text-muted-foreground">{{ tx.fromAccount.name }}</span>
              <span v-if="tx.fromAccount && tx.toAccount" class="text-xs text-muted-foreground">→</span>
              <span v-if="tx.toAccount && tx.type === 'transfer'" class="text-xs text-muted-foreground">{{ tx.toAccount.name }}</span>
              <span
                v-if="tx.category"
                class="text-xs px-1.5 py-0.5 rounded-full border"
                :style="{ color: tx.category.color ?? '#8b5cf6', borderColor: (tx.category.color ?? '#8b5cf6') + '40', background: (tx.category.color ?? '#8b5cf6') + '15' }"
              >{{ tx.category.name }}</span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="text-sm font-semibold" :class="tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-rose-400' : 'text-blue-400'">
              {{ tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '' }}{{ new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(tx.amount)) }}
            </span>
            <span class="text-xs text-muted-foreground">{{ fmtDate(tx.date) }}</span>
          </div>
          <button
            type="button"
            @click="remove(tx.id)"
            class="ml-1 opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    </template>

    <div v-else-if="!carryOver" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground">
          <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      </div>
      <p class="text-sm text-muted-foreground">Nenhuma transação neste mês</p>
    </div>

    <!-- Dialog nova transação -->
    <Dialog :open="showDialog" title="Nova transação" @update:open="showDialog = $event">
      <div class="flex gap-1.5 mb-4 p-1 bg-secondary rounded-lg">
        <button v-for="t in [['expense','Despesa'],['income','Receita'],['transfer','Transf.']]" :key="t[0]" type="button"
          @click="form.type = t[0] as typeof form.type"
          :class="['flex-1 h-8 rounded-md text-xs font-medium transition-all', form.type === t[0] ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']">
          {{ t[1] }}
        </button>
      </div>
      <div class="space-y-3">
        <div><label class="text-xs text-muted-foreground block mb-1">Descrição</label>
          <input v-model="form.description" :class="inputClass" placeholder="Ex: Almoço..." autofocus />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="text-xs text-muted-foreground block mb-1">Valor</label>
            <input v-model="form.amount" :class="inputClass" type="number" step="0.01" placeholder="0,00" />
          </div>
          <div><label class="text-xs text-muted-foreground block mb-1">Data</label>
            <input v-model="form.date" :class="inputClass" type="date" />
          </div>
        </div>
        <div v-if="form.type !== 'income'">
          <label class="text-xs text-muted-foreground block mb-1">{{ form.type === 'transfer' ? 'De' : 'Conta' }}</label>
          <select v-model="form.fromAccountId" :class="selectClass">
            <option value="">Não especificar</option>
            <option v-for="a in accountsStore.accounts.filter(a => ['checking','savings','cash','credit_card'].includes(a.type))" :key="a.id" :value="String(a.id)">{{ a.name }}</option>
          </select>
        </div>
        <div v-if="form.type !== 'expense'">
          <label class="text-xs text-muted-foreground block mb-1">{{ form.type === 'transfer' ? 'Para' : 'Conta' }}</label>
          <select v-model="form.toAccountId" :class="selectClass">
            <option value="">Não especificar</option>
            <option v-for="a in accountsStore.accounts.filter(a => ['checking','savings','cash','investment'].includes(a.type))" :key="a.id" :value="String(a.id)">{{ a.name }}</option>
          </select>
        </div>
        <div class="flex gap-2 pt-1">
          <button type="button" @click="showDialog = false"
            class="flex-1 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancelar</button>
          <button type="button" @click="submit" :disabled="submitting || !form.amount || !form.description"
            class="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <svg v-if="submitting" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Salvar
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
