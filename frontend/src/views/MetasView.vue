<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useMonthStore } from "../stores/month";
import Skeleton from "../components/ui/Skeleton.vue";
import Progress from "../components/ui/Progress.vue";
import api from "../services/api";

const monthStore = useMonthStore();

interface Inv { id: number; name: string; currentAmount: number; targetAmount: number | null; showProgress: boolean; monthlyAmount: number | null; paid: boolean; }
interface MonthSnap { month: number; year: number; saldo: number; totalIncome: number; totalExpenses: number; }

const investments = ref<Inv[]>([]);
const history = ref<MonthSnap[]>([]);
const loading = ref(true);

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}
function fmtK(v: number | null | undefined) {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1000) return `R$${(n / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

async function load() {
  loading.value = true;
  const cur = { month: monthStore.month, year: monthStore.year };
  const params = Array.from({ length: 6 }, (_, i) => {
    let m = cur.month - (5 - i); let y = cur.year;
    while (m <= 0) { m += 12; y--; }
    return { m, y };
  });
  const results = await Promise.all(
    params.map(({ m, y }) =>
      api.get("/dashboard", { params: { month: m, year: y } })
        .then(r => r.data)
        .catch(() => ({ month: m, year: y, saldo: 0, totalIncome: 0, totalExpenses: 0, investments: [] }))
    )
  );
  history.value = results.map(d => ({ month: d.month, year: d.year, saldo: d.saldo, totalIncome: d.totalIncome, totalExpenses: d.totalExpenses }));
  investments.value = results[results.length - 1]?.investments ?? [];
  loading.value = false;
}

onMounted(load);

const savingsHistory = computed(() => history.value.map(m => Math.max(0, m.saldo)));
const incomeHistory = computed(() => history.value.map(m => m.totalIncome));

// Gráfico stacked area: poupança acumulada mês a mês
const savingsChart = computed(() => {
  if (!history.value.length) return null;
  let cumulative = 0;
  const cumulData = savingsHistory.value.map(v => { cumulative += v; return cumulative; });
  return {
    backgroundColor: "transparent",
    grid: { top: 12, bottom: 28, left: 52, right: 16 },
    tooltip: { trigger: "axis", backgroundColor: "#1c1c2e", borderColor: "rgba(255,255,255,0.08)", textStyle: { color: "#f8f8f8", fontSize: 11 }, formatter: (p: any[]) => p.map((s: any) => `${s.marker} ${s.seriesName}: ${fmt(s.value)}`).join("<br/>") },
    xAxis: { type: "category", data: history.value.map(m => MONTH_NAMES[m.month - 1]), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    yAxis: { type: "value", axisLabel: { color: "#64748b", fontSize: 10, formatter: (v: number) => fmtK(v) }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } } },
    series: [
      { name: "Poupança/mês", type: "bar", data: savingsHistory.value, itemStyle: { color: "rgba(52,211,153,0.6)", borderRadius: [4,4,0,0] }, barWidth: "40%" },
      { name: "Acumulado", type: "line", smooth: true, data: cumulData, itemStyle: { color: "#a78bfa" }, lineStyle: { color: "#a78bfa", width: 2 }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(167,139,250,0.2)" }, { offset: 1, color: "rgba(167,139,250,0)" }] } }, symbol: "circle", symbolSize: 5, yAxisIndex: 0 },
    ],
  };
});

// Gráfico de receita vs despesa com "espaço poupável"
const budgetChart = computed(() => {
  if (!history.value.length) return null;
  return {
    backgroundColor: "transparent",
    grid: { top: 24, bottom: 28, left: 48, right: 16 },
    legend: { top: 0, right: 0, textStyle: { color: "#94a3b8", fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
    tooltip: { trigger: "axis", backgroundColor: "#1c1c2e", borderColor: "rgba(255,255,255,0.08)", textStyle: { color: "#f8f8f8", fontSize: 11 }, formatter: (p: any[]) => p.map((s: any) => `${s.marker} ${s.seriesName}: ${fmt(s.value)}`).join("<br/>") },
    xAxis: { type: "category", data: history.value.map(m => MONTH_NAMES[m.month - 1]), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    yAxis: { type: "value", axisLabel: { color: "#64748b", fontSize: 10, formatter: (v: number) => fmtK(v) }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } } },
    series: [
      { name: "Receita", type: "bar", stack: "income", data: incomeHistory.value, itemStyle: { color: "rgba(52,211,153,0.7)", borderRadius: [4,4,0,0] }, barWidth: "50%" },
      { name: "Gastos", type: "bar", stack: "income", data: history.value.map(m => -m.totalExpenses), itemStyle: { color: "rgba(248,113,113,0.7)" } },
    ],
  };
});

const totalInvested = computed(() => investments.value.reduce((s, i) => s + i.currentAmount, 0));
const totalTargets = computed(() => investments.value.filter(i => i.targetAmount).reduce((s, i) => s + (i.targetAmount ?? 0), 0));
const overallProgress = computed(() => totalTargets.value > 0 ? Math.min(100, (totalInvested.value / totalTargets.value) * 100) : 0);

const currentMonthSavings = computed(() => history.value[history.value.length - 1]?.saldo ?? 0);
const daysInMonth = computed(() => new Date(monthStore.year, monthStore.month, 0).getDate());
const today = new Date().getDate();
const dailyBurn = computed(() => {
  const snap = history.value[history.value.length - 1];
  if (!snap || !today) return 0;
  return snap.totalExpenses / today;
});
const projectedMonth = computed(() => dailyBurn.value * daysInMonth.value);
</script>

<template>
  <div class="page">
    <h1 class="text-lg font-bold text-foreground mb-5">Metas</h1>

    <template v-if="loading">
      <Skeleton class="h-28 w-full mb-3" v-for="i in 4" :key="i" />
    </template>

    <template v-else>
      <!-- KPIs -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-xs text-muted-foreground mb-1">Total investido</p>
          <p class="text-2xl font-bold text-emerald-400">{{ fmtK(totalInvested) }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">{{ investments.length }} investimento(s)</p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-xs text-muted-foreground mb-1">Progresso geral</p>
          <p class="text-2xl font-bold text-primary">{{ overallProgress.toFixed(0) }}%</p>
          <p class="text-xs text-muted-foreground mt-0.5">das metas</p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-xs text-muted-foreground mb-1">Gasto médio/dia</p>
          <p class="text-xl font-bold text-rose-400">{{ fmtK(dailyBurn) }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">esse mês (dia {{ today }})</p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-xs text-muted-foreground mb-1">Projeção mensal</p>
          <p class="text-xl font-bold" :class="projectedMonth > (history[history.length - 1]?.totalIncome ?? 0) ? 'text-rose-400' : 'text-amber-400'">{{ fmtK(projectedMonth) }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">de gastos</p>
        </div>
      </div>

      <!-- Investimentos + metas -->
      <div v-if="investments.length" class="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <div class="px-4 py-3 border-b border-border">
          <p class="text-xs font-semibold text-foreground">Progresso dos investimentos</p>
        </div>
        <div v-for="(inv, i) in investments" :key="inv.id" class="px-4 py-4" :class="{ 'border-t border-border': i > 0 }">
          <div class="flex items-center justify-between mb-2">
            <div>
              <p class="text-sm font-medium text-foreground">{{ inv.name }}</p>
              <p class="text-xs text-muted-foreground">{{ fmt(inv.currentAmount) }} acumulado</p>
            </div>
            <div class="text-right">
              <p v-if="inv.targetAmount" class="text-sm font-semibold text-primary">
                {{ inv.targetAmount > 0 ? Math.min(100, (inv.currentAmount / inv.targetAmount) * 100).toFixed(0) : 0 }}%
              </p>
              <p v-if="inv.targetAmount" class="text-xs text-muted-foreground">meta {{ fmtK(inv.targetAmount) }}</p>
            </div>
          </div>
          <Progress v-if="inv.targetAmount" :value="Math.min(100, (inv.currentAmount / inv.targetAmount) * 100)" color="#34d399" />
          <div v-if="inv.targetAmount" class="flex justify-between mt-1">
            <span class="text-xs text-muted-foreground">{{ fmtK(inv.currentAmount) }}</span>
            <span class="text-xs text-muted-foreground text-emerald-400">faltam {{ fmtK((inv.targetAmount ?? 0) - inv.currentAmount) }}</span>
          </div>
          <div v-if="inv.monthlyAmount" class="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Aporte mensal: <span class="text-foreground font-medium">{{ fmt(inv.monthlyAmount) }}</span>
            <span v-if="inv.targetAmount && inv.monthlyAmount > 0">
              · {{ Math.ceil(((inv.targetAmount ?? 0) - inv.currentAmount) / inv.monthlyAmount) }} meses para atingir a meta
            </span>
          </div>
        </div>
      </div>

      <!-- Gráfico: poupança mensal + acumulado -->
      <div class="rounded-xl border border-border bg-card p-4 mb-4">
        <p class="text-xs font-semibold text-foreground mb-3">Poupança por mês + acumulado</p>
        <VChart v-if="savingsChart" :option="savingsChart" :autoresize="true" style="height:200px" />
      </div>

      <!-- Gráfico: receita vs gastos -->
      <div class="rounded-xl border border-border bg-card p-4 mb-4">
        <p class="text-xs font-semibold text-foreground mb-3">Receita × Gastos — visão empilhada</p>
        <VChart v-if="budgetChart" :option="budgetChart" :autoresize="true" style="height:200px" />
      </div>

      <!-- Dicas baseadas em dados -->
      <div class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
        <p class="text-xs font-semibold text-amber-400 mb-2">💡 Insights</p>
        <ul class="space-y-1.5 text-xs text-muted-foreground">
          <li v-if="currentMonthSavings < 0">⚠️ Você está gastando mais do que recebendo este mês.</li>
          <li v-else-if="currentMonthSavings > 0">✅ Você está poupando {{ fmtK(currentMonthSavings) }} este mês.</li>
          <li v-if="overallProgress > 0 && overallProgress < 100">
            📈 Você atingiu {{ overallProgress.toFixed(0) }}% das metas de investimento.
          </li>
          <li v-if="dailyBurn > 0">
            📅 Ao ritmo atual, você vai gastar {{ fmtK(projectedMonth) }} até o fim do mês.
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
