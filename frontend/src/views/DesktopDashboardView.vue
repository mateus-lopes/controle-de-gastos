<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import { useDashboard } from "../composables/useDashboard";

const { data, loading } = useDashboard();

const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
  "#f97316", "#64748b",
];

function fmt(v: number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(v ?? 0));
}

function fmtShort(v: number | string | null) {
  const n = Number(v ?? 0);
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

const pieOptions = computed(() => {
  if (!data.value) return {};
  const catData = data.value.categoriesBreakdown
    .filter((c) => parseFloat(c.total) > 0)
    .map((c, i) => ({
      name: c.categoryName ?? "Sem categoria",
      value: parseFloat(c.total),
      itemStyle: { color: c.categoryColor ?? CHART_COLORS[i % CHART_COLORS.length] },
    }));

  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "#1e293b",
      borderColor: "#334155",
      textStyle: { color: "#f1f5f9" },
      formatter: (p: { name: string; value: number; percent: number }) =>
        `<b>${p.name}</b><br/>${fmt(p.value)} (${p.percent}%)`,
    },
    legend: {
      orient: "vertical",
      right: "2%",
      top: "middle",
      textStyle: { color: "#94a3b8", fontSize: 12 },
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
    },
    series: [
      {
        type: "pie",
        radius: ["48%", "76%"],
        center: ["38%", "50%"],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: "bold", color: "#f1f5f9" },
          scaleSize: 6,
        },
        data: catData.length > 0 ? catData : [{ name: "Sem dados", value: 1, itemStyle: { color: "#334155" } }],
      },
    ],
  };
});

const barOptions = computed(() => {
  if (!data.value) return {};
  const b = data.value.breakdown;

  const rows = [
    { name: "Saídas Fixas", value: b.fixedExpenses, color: "#ef4444" },
    { name: "Gastos Variáveis", value: b.dailyExpenses, color: "#f59e0b" },
    { name: "Parcelas", value: b.installments, color: "#8b5cf6" },
    { name: "Investimentos", value: b.investments, color: "#06b6d4" },
  ].filter((r) => r.value > 0);

  if (rows.length === 0) {
    rows.push({ name: "Sem dados", value: 0, color: "#334155" });
  }

  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#1e293b",
      borderColor: "#334155",
      textStyle: { color: "#f1f5f9" },
      formatter: (params: { name: string; value: number }[]) =>
        `${params[0].name}: ${fmt(params[0].value)}`,
    },
    grid: { left: 16, right: 80, top: 10, bottom: 10, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: {
        color: "#475569",
        fontSize: 11,
        formatter: (v: number) => fmtShort(v),
      },
      splitLine: { lineStyle: { color: "#1e293b" } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: rows.map((r) => r.name),
      axisLabel: { color: "#94a3b8", fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: rows.map((r) => ({
          value: r.value,
          itemStyle: { color: r.color, borderRadius: [0, 6, 6, 0] },
        })),
        label: {
          show: true,
          position: "right",
          color: "#94a3b8",
          fontSize: 11,
          formatter: (p: { value: number }) => fmt(p.value),
        },
        barMaxWidth: 32,
      },
    ],
  };
});

const pendingTotal = computed(() =>
  (data.value?.pending ?? []).reduce((s, p) => s + parseFloat(p.amount), 0)
);

function progress(current: string | null, goal: string | null) {
  if (!current || !goal || parseFloat(goal) === 0) return 0;
  return Math.min(100, (parseFloat(current) / parseFloat(goal)) * 100);
}

const PENDING_TYPE_LABELS: Record<string, string> = {
  fixed_expense: "Saída fixa",
  installment: "Parcela",
  investment: "Investimento",
};
</script>

<template>
  <div class="desktop-dash">
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>

    <template v-else-if="data">
      <!-- Metric cards -->
      <div class="metrics-row">
        <div class="metric-card" :class="Number(data.saldo) >= 0 ? 'metric-positive' : 'metric-negative'">
          <div class="metric-icon metric-icon-saldo">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="metric-body">
            <span class="metric-label">Saldo do Mês</span>
            <span class="metric-value" :class="Number(data.saldo) >= 0 ? 'amount-positive' : 'amount-negative'">
              {{ fmt(data.saldo) }}
            </span>
          </div>
        </div>

        <div class="metric-card metric-income">
          <div class="metric-icon metric-icon-income">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <div class="metric-body">
            <span class="metric-label">Total Entradas</span>
            <span class="metric-value amount-positive">{{ fmt(data.totalIncome) }}</span>
            <span class="metric-sub">Fixas + Variáveis</span>
          </div>
        </div>

        <div class="metric-card metric-expense">
          <div class="metric-icon metric-icon-expense">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
            </svg>
          </div>
          <div class="metric-body">
            <span class="metric-label">Total Saídas</span>
            <span class="metric-value amount-negative">{{ fmt(data.totalExpenses) }}</span>
            <span class="metric-sub">Todos os tipos</span>
          </div>
        </div>

        <div class="metric-card metric-pending">
          <div class="metric-icon metric-icon-pending">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div class="metric-body">
            <span class="metric-label">Pendências</span>
            <span class="metric-value" style="color: var(--warning)">
              {{ data.pending.length }} ite{{ data.pending.length === 1 ? "m" : "ns" }}
            </span>
            <span class="metric-sub">{{ fmt(pendingTotal) }} a pagar</span>
          </div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">Gastos por Categoria</h3>
            <span class="chart-subtitle">Gastos variáveis do mês</span>
          </div>
          <div class="chart-body">
            <VChart
              v-if="data.categoriesBreakdown.length > 0"
              :option="pieOptions"
              :autoresize="true"
              style="height: 260px"
            />
            <div v-else class="chart-empty">
              <span>Nenhum gasto categorizado</span>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">Distribuição de Saídas</h3>
            <span class="chart-subtitle">Por tipo de despesa</span>
          </div>
          <div class="chart-body">
            <VChart :option="barOptions" :autoresize="true" style="height: 260px" />
          </div>
        </div>
      </div>

      <!-- Bottom panels -->
      <div class="panels-row">
        <!-- Pendências -->
        <div class="panel-card">
          <div class="panel-header">
            <h3 class="panel-title">Pendências do Mês</h3>
            <span class="badge badge-pending" v-if="data.pending.length > 0">
              {{ data.pending.length }}
            </span>
          </div>
          <div v-if="data.pending.length === 0" class="panel-empty">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" style="width:40px;height:40px;color:var(--text-muted)">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Tudo em dia!</p>
          </div>
          <div v-else class="pending-list">
            <div v-for="item in data.pending" :key="`${item.type}-${item.id}`" class="pending-item">
              <div class="pending-left">
                <span class="pending-type-badge">
                  {{ PENDING_TYPE_LABELS[item.type] ?? item.type }}
                </span>
                <span class="pending-desc">
                  {{ item.description }}
                  <span v-if="item.installmentNumber" class="parcel-tag">
                    {{ item.installmentNumber }}/{{ item.totalInstallments }}
                  </span>
                </span>
              </div>
              <span class="pending-amount amount-negative">{{ fmt(item.amount) }}</span>
            </div>
          </div>
        </div>

        <!-- Cartões + Investimentos -->
        <div class="panel-card">
          <div v-if="data.creditCards.length > 0">
            <div class="panel-header">
              <h3 class="panel-title">Faturas dos Cartões</h3>
            </div>
            <div class="invoices-list">
              <div v-for="card in data.creditCards" :key="card.id" class="invoice-row">
                <div class="invoice-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="invoice-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  <span class="invoice-name">{{ card.name }}</span>
                </div>
                <div class="invoice-right">
                  <span class="invoice-amount">{{ fmt(card.invoiceAmount) }}</span>
                  <span class="badge" :class="card.paid ? 'badge-paid' : 'badge-pending'">
                    {{ card.paid ? "Pago" : "Pendente" }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <hr class="divider" v-if="data.creditCards.length > 0 && data.investments.length > 0" />

          <div v-if="data.investments.length > 0">
            <div class="panel-header" :style="data.creditCards.length > 0 ? 'padding-top:16px' : ''">
              <h3 class="panel-title">Investimentos</h3>
            </div>
            <div class="investments-list">
              <div v-for="inv in data.investments" :key="inv.id" class="investment-row">
                <div class="inv-top">
                  <div class="inv-info">
                    <span class="inv-name">{{ inv.name }}</span>
                    <span class="inv-type">{{ inv.type }}</span>
                  </div>
                  <div class="inv-right">
                    <span class="inv-amount">{{ fmt(inv.monthlyAmount) }}/mês</span>
                    <span class="badge" :class="inv.paid ? 'badge-paid' : 'badge-pending'">
                      {{ inv.paid ? "Aportado" : "Pendente" }}
                    </span>
                  </div>
                </div>
                <template v-if="inv.showProgress && inv.goalAmount">
                  <div class="inv-progress-wrap">
                    <div class="progress-bar-bg">
                      <div
                        class="progress-bar-fill"
                        :style="{ width: `${progress(inv.currentAmount, inv.goalAmount)}%` }"
                      />
                    </div>
                    <div class="progress-labels">
                      <span>{{ fmt(inv.currentAmount) }}</span>
                      <span>{{ Math.round(progress(inv.currentAmount, inv.goalAmount)) }}% de {{ fmt(inv.goalAmount) }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div
            v-if="data.creditCards.length === 0 && data.investments.length === 0"
            class="panel-empty"
          >
            <p>Nenhum cartão ou investimento cadastrado</p>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="loading-overlay">
      <p style="color: var(--text-muted)">Nenhum dado disponível</p>
    </div>
  </div>
</template>

<style scoped>
.desktop-dash {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Metric cards */
.metrics-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metric-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  border-left: 3px solid transparent;
  transition: transform 0.15s;
}

.metric-card:hover {
  transform: translateY(-1px);
}

.metric-positive { border-left-color: var(--success); }
.metric-negative { border-left-color: var(--danger); }
.metric-income   { border-left-color: var(--success); }
.metric-expense  { border-left-color: var(--danger); }
.metric-pending  { border-left-color: var(--warning); }

.metric-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-icon svg { width: 22px; height: 22px; }

.metric-icon-saldo   { background: rgba(59, 130, 246, 0.12);  color: var(--accent); }
.metric-icon-income  { background: rgba(34, 197, 94, 0.12);   color: var(--success); }
.metric-icon-expense { background: rgba(239, 68, 68, 0.12);   color: var(--danger); }
.metric-icon-pending { background: rgba(245, 158, 11, 0.12);  color: var(--warning); }

.metric-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
}

.metric-value {
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.2;
}

.metric-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.chart-header {
  padding: 18px 20px 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.chart-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.chart-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.chart-body {
  padding: 4px 16px 16px;
}

.chart-empty {
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* Panels */
.panels-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.panel-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 0.95rem;
  font-weight: 600;
  flex: 1;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 120px;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pending-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.pending-item:last-child {
  border-bottom: none;
}

.pending-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pending-type-badge {
  font-size: 0.68rem;
  background: var(--bg-card-hover);
  color: var(--text-muted);
  padding: 2px 7px;
  border-radius: 99px;
  white-space: nowrap;
  flex-shrink: 0;
}

.pending-desc {
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 5px;
}

.parcel-tag {
  font-size: 0.68rem;
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
  padding: 1px 6px;
  border-radius: 99px;
  flex-shrink: 0;
}

.pending-amount {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Invoices */
.invoices-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.invoice-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}

.invoice-row:last-child {
  border-bottom: none;
}

.invoice-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoice-icon {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.invoice-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.invoice-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.invoice-amount {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Investments */
.investments-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.investment-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inv-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.inv-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.inv-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.inv-type {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: capitalize;
}

.inv-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.inv-amount {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.inv-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar-bg {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #6366f1);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 16px 0 0;
}
</style>
