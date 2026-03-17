import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="page-head">
        <div>
          <p class="eyebrow">Resumen general</p>
          <h1 class="page-title">Dashboard</h1>
        </div>
        <a routerLink="/proyectos" class="cta">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo proyecto
        </a>
      </div>

      <!-- KPI cards -->
      @if (svc.loading()) {
        <div class="kpi-grid">
          @for (i of [1,2,3,4]; track i) { <div class="kpi-card skeleton"></div> }
        </div>
      } @else {
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Ingresos del mes</span>
              <span class="kpi-badge green">↑ activo</span>
            </div>
            <div class="kpi-value">{{ fmt(svc.stats().ingresosMes) }}</div>
            <div class="kpi-sub">Este mes calendario</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Total cobrado</span>
              <span class="kpi-badge blue">acumulado</span>
            </div>
            <div class="kpi-value">{{ fmt(svc.stats().ingresosTotal) }}</div>
            <div class="kpi-sub">Todos los proyectos</div>
          </div>

          <div class="kpi-card accent-card">
            <div class="kpi-top">
              <span class="kpi-label">Proyectos activos</span>
              <span class="kpi-badge purple">en progreso</span>
            </div>
            <div class="kpi-value">{{ svc.stats().proyectosActivos }}</div>
            <div class="kpi-sub">Requieren atención</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">Por cobrar</span>
              <span class="kpi-badge amber">pendiente</span>
            </div>
            <div class="kpi-value">{{ fmt(svc.stats().cobrosPendientes) }}</div>
            <div class="kpi-sub">Saldo restante total</div>
          </div>
        </div>
      }

      <div class="bottom-grid">
        <!-- Gráfico de ingresos -->
        <div class="chart-panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Ingresos cobrados</h2>
              <p class="panel-sub">Últimos 6 meses</p>
            </div>
          </div>
          <div class="chart-area">
            @for (item of svc.ingresosPorMes(); track item.mes) {
              <div class="bar-col">
                <div class="bar-track">
                  <div class="bar-fill" [style.height.%]="barPct(item.total)"
                       [class.bar-zero]="item.total === 0">
                    <div class="bar-tip" [attr.data-val]="fmt(item.total)"></div>
                  </div>
                </div>
                <span class="bar-label">{{ item.mes }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Cobro global -->
        <div class="progress-panel">
          <div class="panel-head">
            <h2 class="panel-title">Cobro global</h2>
          </div>
          <div class="big-pct">{{ svc.stats().porcentajeCobrado }}<span class="pct-sym">%</span></div>
          <p class="pct-label">del total presupuestado</p>
          <div class="track">
            <div class="fill" [style.width.%]="svc.stats().porcentajeCobrado"></div>
          </div>
          <div class="pct-detail">
            <div class="pct-row">
              <span class="dot green-dot"></span>
              <span class="pct-key">Cobrado</span>
              <span class="pct-val green">{{ fmt(svc.stats().ingresosTotal) }}</span>
            </div>
            <div class="pct-row">
              <span class="dot amber-dot"></span>
              <span class="pct-key">Pendiente</span>
              <span class="pct-val amber">{{ fmt(svc.stats().cobrosPendientes) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 940px; }

    /* Header */
    .page-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; }
    .eyebrow { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent-2); margin-bottom: 4px; }
    .page-title { font-size: 1.625rem; font-weight: 600; color: var(--ink); letter-spacing: -0.03em; }
    .cta {
      display: flex; align-items: center; gap: 7px;
      padding: 9px 16px;
      background: var(--accent);
      border-radius: var(--radius);
      color: white;
      font-size: 13px;
      font-weight: 500;
      transition: opacity 0.15s, transform 0.1s;
    }
    .cta:hover { opacity: 0.88; transform: translateY(-1px); }

    /* KPI */
    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }

    .kpi-card {
      background: var(--bg-2);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 18px 18px 16px;
      transition: border-color 0.2s;
    }
    .kpi-card:hover { border-color: var(--line-2); }
    .kpi-card.accent-card {
      background: linear-gradient(135deg, rgba(124,106,247,0.12), rgba(124,106,247,0.04));
      border-color: rgba(124,106,247,0.25);
    }
    .kpi-card.skeleton {
      height: 102px;
      animation: shimmer 1.4s ease infinite;
      background: linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%);
      background-size: 200% 100%;
    }
    @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }

    .kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .kpi-label { font-size: 12px; color: var(--ink-3); font-weight: 500; }
    .kpi-badge {
      font-size: 10px;
      font-weight: 500;
      padding: 2px 7px;
      border-radius: 999px;
      letter-spacing: 0.02em;
    }
    .kpi-badge.green  { background: var(--green-bg);  color: var(--green); }
    .kpi-badge.blue   { background: var(--blue-bg);   color: var(--blue); }
    .kpi-badge.purple { background: var(--accent-glow); color: var(--accent-2); }
    .kpi-badge.amber  { background: var(--amber-bg);  color: var(--amber); }

    .kpi-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--ink);
      letter-spacing: -0.03em;
      font-family: var(--mono);
      margin-bottom: 4px;
    }
    .kpi-sub { font-size: 11px; color: var(--ink-3); }

    /* Bottom grid */
    .bottom-grid { display: grid; grid-template-columns: 1fr 260px; gap: 12px; }

    /* Chart panel */
    .chart-panel, .progress-panel {
      background: var(--bg-2);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 20px;
    }
    .panel-head { margin-bottom: 20px; }
    .panel-title { font-size: 14px; font-weight: 600; color: var(--ink); letter-spacing: -0.02em; }
    .panel-sub   { font-size: 12px; color: var(--ink-3); margin-top: 2px; }

    .chart-area { display: flex; align-items: flex-end; gap: 8px; height: 140px; }
    .bar-col { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 6px; height: 100%; }
    .bar-track { flex: 1; width: 100%; display: flex; align-items: flex-end; }
    .bar-fill {
      width: 100%;
      min-height: 3px;
      background: linear-gradient(180deg, var(--accent) 0%, rgba(124,106,247,0.4) 100%);
      border-radius: 4px 4px 0 0;
      position: relative;
      transition: height 0.4s cubic-bezier(.22,.61,.36,1);
    }
    .bar-fill.bar-zero { background: var(--bg-3); }
    .bar-tip {
      position: absolute;
      top: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-3);
      border: 1px solid var(--line-2);
      color: var(--ink-2);
      font-size: 10px;
      font-family: var(--mono);
      padding: 2px 6px;
      border-radius: 5px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s;
    }
    .bar-tip::after { content: attr(data-val); }
    .bar-fill:hover .bar-tip { opacity: 1; }
    .bar-label { font-size: 11px; color: var(--ink-3); }

    /* Progress panel */
    .big-pct {
      font-size: 3.5rem;
      font-weight: 600;
      color: var(--ink);
      letter-spacing: -0.05em;
      font-family: var(--mono);
      line-height: 1;
      margin-bottom: 4px;
    }
    .pct-sym { font-size: 1.5rem; color: var(--ink-3); }
    .pct-label { font-size: 12px; color: var(--ink-3); margin-bottom: 16px; }

    .track { height: 6px; background: var(--bg-3); border-radius: 999px; overflow: hidden; margin-bottom: 20px; }
    .fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); border-radius: 999px; transition: width 0.6s cubic-bezier(.22,.61,.36,1); }

    .pct-detail { display: flex; flex-direction: column; gap: 10px; }
    .pct-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
    .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .green-dot { background: var(--green); }
    .amber-dot { background: var(--amber); }
    .pct-key { flex: 1; color: var(--ink-3); }
    .pct-val { font-family: var(--mono); font-size: 12px; font-weight: 500; }
    .pct-val.green { color: var(--green); }
    .pct-val.amber { color: var(--amber); }
  `]
})
export class DashboardComponent implements OnInit {
  svc = inject(DashboardService);

  ngOnInit() { this.svc.load(); }

  fmt(n: number) {
    return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(n);
  }

  barPct(total: number) {
    const max = Math.max(...this.svc.ingresosPorMes().map(m => m.total), 1);
    return Math.max(2, Math.round((total / max) * 100));
  }
}
