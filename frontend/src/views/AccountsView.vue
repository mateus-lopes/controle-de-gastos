<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAccountsStore, type Account } from "../stores/accounts";
import { useMonthStore } from "../stores/month";
import { useToast } from "../composables/useToast";
import Skeleton from "../components/ui/Skeleton.vue";
import Dialog from "../components/ui/Dialog.vue";
import Badge from "../components/ui/Badge.vue";
import Progress from "../components/ui/Progress.vue";
import api from "../services/api";

const store = useAccountsStore();
const monthStore = useMonthStore();
const { success, error } = useToast();

const showDialog = ref(false);
const submitting = ref(false);
const form = ref({ name: "", type: "checking" as Account["type"], color: "#8b5cf6", targetAmount: "", showProgress: false });

const typeOptions = [
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "cash", label: "Dinheiro" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "investment", label: "Investimento" },
];

const inputClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const selectClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer";

const typeIcon: Record<string, string> = {
  checking: `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  savings: `<path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>`,
  cash: `<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>`,
  credit_card: `<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>`,
  investment: `<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`,
};

onMounted(async () => {
  await store.loadAccounts();
  for (const cc of store.accounts.filter(a => a.type === "credit_card")) {
    await loadInvoice(cc.id);
  }
});

const assetAccounts = computed(() => store.accounts.filter(a => ["checking", "savings", "cash"].includes(a.type)));
const creditCards = computed(() => store.accounts.filter(a => a.type === "credit_card"));
const investments = computed(() => store.accounts.filter(a => a.type === "investment"));

function fmt(v: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}
function pct(current: string, target: string | null) {
  if (!target || parseFloat(target) === 0) return 0;
  return Math.min(100, (parseFloat(current) / parseFloat(target)) * 100);
}

const invoiceCache = ref<Record<string, { amount: number; paid: boolean }>>({});

async function loadInvoice(accountId: number) {
  const key = `${accountId}-${monthStore.month}-${monthStore.year}`;
  if (invoiceCache.value[key]) return;
  try {
    const { data } = await api.get(`/accounts/${accountId}/invoice`, { params: { month: monthStore.month, year: monthStore.year } });
    invoiceCache.value[key] = { amount: data.amount, paid: data.paid };
  } catch { /* ignore */ }
}

async function toggleInvoice(accountId: number) {
  try {
    await api.patch(`/accounts/${accountId}/invoice/pay`, { month: monthStore.month, year: monthStore.year });
    const key = `${accountId}-${monthStore.month}-${monthStore.year}`;
    delete invoiceCache.value[key];
    await loadInvoice(accountId);
  } catch { error("Erro ao atualizar fatura"); }
}

function openNew() {
  form.value = { name: "", type: "checking", color: "#8b5cf6", targetAmount: "", showProgress: false };
  showDialog.value = true;
}

async function submit() {
  if (!form.value.name.trim()) return;
  submitting.value = true;
  try {
    await store.createAccount({
      name: form.value.name, type: form.value.type, color: form.value.color,
      targetAmount: form.value.targetAmount ? parseFloat(form.value.targetAmount) : null,
      showProgress: form.value.showProgress,
    });
    showDialog.value = false;
    success("Conta criada");
  } catch { error("Erro ao criar conta"); }
  finally { submitting.value = false; }
}

async function remove(id: number) {
  try { await store.deleteAccount(id); success("Conta removida"); }
  catch { error("Erro ao remover"); }
}
</script>

<template>
  <div class="page">
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-lg font-bold text-foreground">Contas</h1>
      <button type="button" @click="openNew"
        class="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <template v-if="store.loading">
      <Skeleton class="h-16 w-full mb-2" v-for="i in 3" :key="i" />
    </template>

    <template v-else>
      <!-- Contas bancárias -->
      <template v-if="assetAccounts.length">
        <p class="section-label">Contas bancárias</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-5">
          <div v-for="(acc, i) in assetAccounts" :key="acc.id" class="flex items-center gap-3 px-4 py-3 group" :class="{ 'border-t border-border': i > 0 }">
            <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" :style="{ background: (acc.color ?? '#8b5cf6') + '20', color: acc.color ?? '#8b5cf6' }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" v-html="typeIcon[acc.type]" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-foreground">{{ acc.name }}</p>
              <p class="text-xs text-muted-foreground">{{ typeOptions.find(t => t.value === acc.type)?.label }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold" :class="Number(acc.balance) >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ fmt(acc.balance) }}</span>
              <button type="button" @click="remove(acc.id)" class="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Cartões -->
      <template v-if="creditCards.length">
        <p class="section-label">Cartões de crédito</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-5">
          <button v-for="(cc, i) in creditCards" :key="cc.id" type="button"
            @click="toggleInvoice(cc.id)"
            class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors group"
            :class="{ 'border-t border-border': i > 0 }">
            <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" :style="{ background: (cc.color ?? '#8b5cf6') + '20', color: cc.color ?? '#8b5cf6' }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" v-html="typeIcon['credit_card']" />
            </div>
            <div class="flex-1 min-w-0 text-left">
              <p class="text-sm font-medium text-foreground">{{ cc.name }}</p>
              <p class="text-xs text-muted-foreground">Fatura {{ monthStore.label }}</p>
            </div>
            <div class="flex items-center gap-2">
              <template v-if="invoiceCache[`${cc.id}-${monthStore.month}-${monthStore.year}`]">
                <span class="text-sm font-semibold text-rose-400">{{ fmt(invoiceCache[`${cc.id}-${monthStore.month}-${monthStore.year}`].amount) }}</span>
                <Badge :variant="invoiceCache[`${cc.id}-${monthStore.month}-${monthStore.year}`].paid ? 'success' : 'warning'">
                  {{ invoiceCache[`${cc.id}-${monthStore.month}-${monthStore.year}`].paid ? 'Pago' : 'Aberto' }}
                </Badge>
              </template>
            </div>
          </button>
        </div>
      </template>

      <!-- Investimentos -->
      <template v-if="investments.length">
        <p class="section-label">Investimentos</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-5">
          <div v-for="(inv, i) in investments" :key="inv.id" class="px-4 py-3 group" :class="{ 'border-t border-border': i > 0 }">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.75" v-html="typeIcon['investment']" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground">{{ inv.name }}</p>
                <p class="text-xs text-muted-foreground">{{ fmt(inv.currentAmount) }} acumulado</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-emerald-400">{{ fmt(inv.currentAmount) }}</span>
                <button type="button" @click.stop="remove(inv.id)" class="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                </button>
              </div>
            </div>
            <template v-if="inv.showProgress && inv.targetAmount">
              <Progress :value="pct(inv.currentAmount, inv.targetAmount)" class="mt-3" color="#34d399" />
              <div class="flex justify-between mt-1">
                <span class="text-xs text-muted-foreground">{{ fmt(inv.currentAmount) }}</span>
                <span class="text-xs text-muted-foreground">Meta: {{ fmt(inv.targetAmount) }}</span>
              </div>
            </template>
          </div>
        </div>
      </template>

      <div v-if="!store.accounts.length" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground">
            <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">Nenhuma conta cadastrada</p>
      </div>
    </template>

    <Dialog :open="showDialog" title="Nova conta" @update:open="showDialog = $event">
      <div class="space-y-3">
        <div><label class="text-xs text-muted-foreground block mb-1">Nome</label>
          <input v-model="form.name" :class="inputClass" placeholder="Ex: Nubank, Itaú..." autofocus />
        </div>
        <div><label class="text-xs text-muted-foreground block mb-1">Tipo</label>
          <select v-model="form.type" :class="selectClass">
            <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex-1"><label class="text-xs text-muted-foreground block mb-1">Cor</label></div>
          <input type="color" v-model="form.color" class="h-9 w-16 rounded-lg border border-input cursor-pointer bg-secondary/60" />
        </div>
        <template v-if="form.type === 'investment'">
          <div><label class="text-xs text-muted-foreground block mb-1">Meta (R$, opcional)</label>
            <input v-model="form.targetAmount" :class="inputClass" type="number" step="0.01" placeholder="50000,00" />
          </div>
          <div class="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
            <label class="text-sm text-foreground">Mostrar progresso</label>
            <button type="button" @click="form.showProgress = !form.showProgress"
              :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', form.showProgress ? 'bg-primary' : 'bg-muted']">
              <span :class="['pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform', form.showProgress ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </div>
        </template>
        <div class="flex gap-2 pt-1">
          <button type="button" @click="showDialog = false" class="flex-1 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancelar</button>
          <button type="button" @click="submit" :disabled="submitting || !form.name" class="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <svg v-if="submitting" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Criar conta
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
