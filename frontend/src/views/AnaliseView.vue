<script setup lang="ts">
import { computed } from "vue";
import { useDashboard } from "../composables/useDashboard";
import Skeleton from "../components/ui/Skeleton.vue";
import MonthNavigator from "../components/MonthNavigator.vue";

const { data, loading } = useDashboard();

function fmt(v: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}
function fmtK(v: number | null | undefined) {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1000) return `R$${(n / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

const cats = computed(() =>
  (data.value?.categoriesBreakdown ?? [])
    .filter(c => Number(c.total) > 0)
    .sort((a, b) => Number(b.total) - Number(a.total))
);

const totalCatExpenses = computed(() => cats.value.reduce((s, c) => s + Number(c.total), 0));

// Gráfico de barras horizontal
const barChart = computed(() => {
  if (!cats.value.length) return null;
  const names = cats.value.map(c => c.categoryName ?? "Sem categoria").slice(0, 8);
  const values = cats.value.map(c => Number(c.total)).slice(0, 8);
  const colors = cats.value.map(c => c.categoryColor ?? "#8b5cf6").slice(0, 8);
  return {
    backgroundColor: "transparent",
    grid: { top: 4, bottom: 4, left: 80, right: 60 },
    tooltip: { trigger: "axis", axisPointer: { type: "none" }, backgroundColor: "#1c1c2e", borderColor: "rgba(255,255,255,0.08)", textStyle: { color: "#f8f8f8", fontSize: 11 }, formatter: (p: any[]) => `<b>${p[0].name}</b><br/>${fmt(p[0].value)}` },
    xAxis: { type: "value", show: false },
    yAxis: { type: "category", data: names, inverse: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#94a3b8", fontSize: 11, width: 76, overflow: "truncate" } },
    series: [{
      type: "bar", data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] } })),
      barWidth: 14,
      label: { show: true, position: "right", formatter: (p: any) => fmtK(p.value), color: "#94a3b8", fontSize: 10 },
    }],
  };
});

// Radar chart
const radarChart = computed(() => {
  if (cats.value.length < 3) return null;
  const top = cats.value.slice(0, 7);
  const maxVal = Math.max(...top.map(c => Number(c.total)));
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", backgroundColor: "#1c1c2e", borderColor: "rgba(255,255,255,0.08)", textStyle: { color: "#f8f8f8", fontSize: 11 } },
    radar: {
      indicator: top.map(c => ({ name: c.categoryName ?? "?", max: maxVal * 1.1 })),
      center: ["50%", "50%"], radius: "72%",
      axisName: { color: "#94a3b8", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      splitArea: { areaStyle: { color: ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.01)"] } },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
    },
    series: [{
      type: "radar",
      data: [{ value: top.map(c => Number(c.total)), name: "Gastos", areaStyle: { color: "rgba(139,92,246,0.15)" }, lineStyle: { color: "#8b5cf6", width: 2 }, itemStyle: { color: "#8b5cf6" } }],
    }],
  };
});

// Gauge taxa poupança
const savingsGauge = computed(() => {
  if (!data.value) return null;
  const rate = data.value.totalIncome > 0
    ? Math.max(0, Math.min(100, (data.value.saldo / data.value.totalIncome) * 100))
    : 0;
  const color = rate >= 30 ? "#34d399" : rate >= 15 ? "#fbbf24" : "#f87171";
  return {
    backgroundColor: "transparent",
    series: [{
      type: "gauge",
      startAngle: 200, endAngle: -20,
      min: 0, max: 100,
      radius: "90%", center: ["50%", "60%"],
      progress: { show: true, width: 14, itemStyle: { color } },
      pointer: { show: false },
      axisLine: { lineStyle: { width: 14, color: [[1, "rgba(255,255,255,0.06)"]] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      detail: { valueAnimation: true, formatter: "{value}%", color, fontSize: 22, fontWeight: "bold", offsetCenter: [0, "-5%"] },
      title: { show: true, offsetCenter: [0, "20%"], color: "#64748b", fontSize: 11 },
      data: [{ value: parseFloat(rate.toFixed(1)), name: "poupança" }],
    }],
  };
});

const topCat = computed(() => cats.value[0]);
const pctTop = computed(() => totalCatExpenses.value > 0 ? (Number(topCat.value?.total ?? 0) / totalCatExpenses.value) * 100 : 0);
const incomeVsExpenseRatio = computed(() => data.value?.totalIncome ? (data.value.totalExpenses / data.value.totalIncome) * 100 : 0);
</script>

<template>
  <div class="page">
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-lg font-bold text-foreground">Análise</h1>
      <MonthNavigator />
    </div>

    <template v-if="loading">
      <Skeleton class="h-32 w-full mb-3" v-for="i in 3" :key="i" />
    </template>

    <template v-else-if="data">
      <!-- Stats row -->
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="rounded-xl border border-border bg-card p-3 text-center">
          <p class="text-xs text-muted-foreground mb-1">Comprometimento</p>
          <p class="text-lg font-bold" :class="incomeVsExpenseRatio > 90 ? 'text-rose-400' : incomeVsExpenseRatio > 70 ? 'text-amber-400' : 'text-emerald-400'">
            {{ incomeVsExpenseRatio.toFixed(0) }}%
          </p>
          <p class="text-xs text-muted-foreground">da receita</p>
        </div>
        <div class="rounded-xl border border-border bg-card p-3 text-center">
          <p class="text-xs text-muted-foreground mb-1">Categorias</p>
          <p class="text-lg font-bold text-foreground">{{ cats.length }}</p>
          <p class="text-xs text-muted-foreground">ativas</p>
        </div>
        <div class="rounded-xl border border-border bg-card p-3 text-center">
          <p class="text-xs text-muted-foreground mb-1">Maior gasto</p>
          <p class="text-lg font-bold text-rose-400">{{ pctTop.toFixed(0) }}%</p>
          <p class="text-xs text-muted-foreground truncate">{{ topCat?.categoryName ?? "—" }}</p>
        </div>
      </div>

      <!-- Gauge poupança -->
      <div class="rounded-xl border border-border bg-card p-4 mb-4">
        <p class="text-xs font-semibold text-foreground mb-1">Taxa de poupança</p>
        <VChart v-if="savingsGauge" :option="savingsGauge" :autoresize="true" style="height:160px" />
      </div>

      <!-- Barras horizontais por categoria -->
      <div class="rounded-xl border border-border bg-card p-4 mb-4">
        <p class="text-xs font-semibold text-foreground mb-3">Gastos por categoria</p>
        <VChart v-if="barChart" :option="barChart" :autoresize="true" :style="`height:${Math.max(cats.length, 1) * 28 + 20}px`" />
        <div v-else class="py-8 text-center text-xs text-muted-foreground">Nenhum gasto registrado</div>
      </div>

      <!-- Radar categories -->
      <div v-if="radarChart" class="rounded-xl border border-border bg-card p-4 mb-4">
        <p class="text-xs font-semibold text-foreground mb-3">Radar de categorias</p>
        <VChart :option="radarChart" :autoresize="true" style="height:220px" />
      </div>

      <!-- Lista de categorias com % -->
      <div class="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <div class="px-4 py-3 border-b border-border">
          <p class="text-xs font-semibold text-foreground">Participação por categoria</p>
        </div>
        <div v-for="(cat, i) in cats" :key="cat.categoryId" class="px-4 py-2.5" :class="{ 'border-t border-border': i > 0 }">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: cat.categoryColor ?? '#8b5cf6' }" />
            <span class="text-sm text-foreground flex-1">{{ cat.categoryName ?? "Sem categoria" }}</span>
            <span class="text-xs text-muted-foreground">{{ totalCatExpenses > 0 ? ((Number(cat.total) / totalCatExpenses) * 100).toFixed(0) : 0 }}%</span>
            <span class="text-sm font-medium text-foreground w-16 text-right">{{ fmtK(cat.total) }}</span>
          </div>
          <div class="h-1 rounded-full bg-secondary overflow-hidden">
            <div class="h-full rounded-full transition-all" :style="{ width: totalCatExpenses > 0 ? `${(Number(cat.total) / totalCatExpenses) * 100}%` : '0%', background: cat.categoryColor ?? '#8b5cf6' }" />
          </div>
        </div>
        <div v-if="!cats.length" class="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum gasto no mês</div>
      </div>
    </template>
  </div>
</template>
