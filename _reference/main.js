/* ============================================================
   HOMEBOT — Main JS
   Initializes: sidebar toggle, spending chart
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initSpendingChart();
});


/* ------------------------------------------------------------
   Sidebar toggle
   ------------------------------------------------------------ */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('sidebarToggle');
  if (!sidebar || !toggle) return;

  toggle.addEventListener('click', () => {
    const isExpanded = sidebar.classList.toggle('expanded');
    toggle.setAttribute('aria-expanded', String(isExpanded));
  });
}


/* ------------------------------------------------------------
   Spending Chart (Chart.js area chart)
   Mirrors the design: salmon "This month" fill + gray dashed
   average line, no visible legend (legend is in HTML).
   ------------------------------------------------------------ */
function initSpendingChart() {
  const canvas = document.getElementById('spendingChart');
  if (!canvas) return;

  // Wait for Chart.js (loaded with defer)
  if (typeof Chart === 'undefined') {
    document.querySelector('script[src*="chart.js"]')
      ?.addEventListener('load', () => initSpendingChart());
    return;
  }

  // X-axis labels: Day 1 … Day 31
  const labels = Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`);

  // Cumulative spending — "This month" rises to $67,976 around Day 20
  const thisMonth = [
    0, 1_400, 3_100, 5_200, 7_800, 10_600, 13_800, 17_200, 20_900, 25_100,
    29_600, 34_200, 38_900, 43_400, 47_800, 52_100, 56_300, 60_200, 63_400, 65_800,
    66_900, 67_200, 67_500, 67_700, 67_850, 67_930, 67_960, 67_972, 67_976, 67_976, 67_976
  ];

  // Cumulative "Average month" — flatter, ends ~$48K
  const avgMonth = [
    0, 900, 2_100, 3_700, 5_600, 7_400, 9_300, 11_400, 13_700, 16_200,
    18_700, 21_400, 24_100, 26_800, 29_500, 32_100, 34_600, 37_000, 39_200, 41_200,
    42_900, 44_200, 45_300, 46_200, 46_900, 47_400, 47_700, 47_860, 47_950, 47_990, 48_000
  ];

  const ctx = canvas.getContext('2d');

  // Gradient fill under "This month" line
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0,    'rgba(255, 105, 45, 0.32)');
  grad.addColorStop(0.55, 'rgba(255, 105, 45, 0.14)');
  grad.addColorStop(1,    'rgba(255, 105, 45, 0.01)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Average month (last 12 months)',
          data: avgMonth,
          borderColor: '#aaaaaa',
          borderWidth: 1.5,
          borderDash: [5, 4],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
        },
        {
          label: 'This month',
          data: thisMonth,
          borderColor: '#FF692D',
          borderWidth: 2.5,
          fill: true,
          backgroundColor: grad,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#FF692D',
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#22201d',
          bodyColor: '#84827f',
          borderColor: '#efece9',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          boxPadding: 4,
          callbacks: {
            title(items) {
              return items[0].label;
            },
            label(item) {
              const val = item.parsed.y;
              return `${item.dataset.label}: $${val.toLocaleString('en-US')}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: '#84827f',
            font: { size: 11, family: 'Inter, sans-serif', weight: '500' },
            maxRotation: 0,
            maxTicksLimit: 8,
            callback(_val, idx) {
              const day = idx + 1;
              if ([1, 5, 9, 13, 17, 21, 25, 31].includes(day)) return `Day ${day}`;
              return null;
            },
          },
        },
        y: {
          grid: {
            color: '#efece9',
            lineWidth: 1,
          },
          border: { display: false, dash: [] },
          beginAtZero: true,
          max: 80_000,
          ticks: {
            color: '#84827f',
            font: { size: 11, family: 'Inter, sans-serif', weight: '500' },
            stepSize: 20_000,
            callback(val) {
              if (val === 0) return '$0';
              return `$${(val / 1000).toFixed(0)}K`;
            },
          },
        },
      },
    },
  });
}
