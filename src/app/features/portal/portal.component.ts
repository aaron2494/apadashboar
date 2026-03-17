import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { inject } from '@angular/core';
import { ProyectoService } from '../../core/services/proyecto.service';
import { PagoService } from '../../core/services/pago.service';
import { EntregableService } from '../../core/services/entregable.service';
import { Proyecto, EstadoProyecto } from '../../core/models';
import { CATEGORIAS } from '../../core/services/hora.service';
import { HoraService } from '../../core/services/hora.service';

const META: Record<EstadoProyecto, { label: string; color: string }> = {
  EN_PROGRESO: { label: 'En progreso', color: '#60a5fa' },
  PAUSADO:     { label: 'Pausado',     color: '#fbbf24' },
  COMPLETADO:  { label: 'Completado',  color: '#34d399' },
  CANCELADO:   { label: 'Cancelado',   color: '#f87171' },
};

@Component({
  selector: 'app-portal',
  standalone: true,
  template: `
    <div class="portal">
      @if (loading()) {
        <div class="center"><div class="spin"></div></div>
      } @else if (!proyecto()) {
        <div class="not-found">
          <div class="nf-icon">🔒</div>
          <h1>Proyecto no encontrado</h1>
          <p>El link puede haber expirado o ser incorrecto.</p>
        </div>
      } @else {
        <div class="wrap">
          <!-- Header del portal -->
          <div class="portal-header">
            <div class="agency-badge">APA Marketing</div>
            <div class="portal-meta">
              <span class="portal-label">Portal de seguimiento</span>
            </div>
          </div>

          <!-- Info del proyecto -->
          <div class="proj-card">
            <div class="proj-top">
              <div>
                <h1 class="proj-name">{{ proyecto()!.nombre }}</h1>
                <p class="proj-client">{{ proyecto()!.clientes?.empresa }}</p>
                @if (proyecto()!.descripcion) {
                  <p class="proj-desc">{{ proyecto()!.descripcion }}</p>
                }
              </div>
              <div class="estado-badge" [style.color]="META[proyecto()!.estado].color"
                   [style.border-color]="META[proyecto()!.estado].color + '40'"
                   [style.background]="META[proyecto()!.estado].color + '15'">
                {{ META[proyecto()!.estado].label }}
              </div>
            </div>

            <!-- Progreso de pago -->
            <div class="progress-section">
              <div class="progress-info">
                <span class="progress-label">Progreso de cobro</span>
                <span class="progress-pct">{{ pct() }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="pct()"></div>
              </div>
              <div class="progress-detail">
                <span class="pd-item">
                  <span class="pd-dot green"></span>
                  Cobrado: <strong>{{ fmt(proyecto()!.monto_cobrado) }}</strong>
                </span>
                <span class="pd-item">
                  <span class="pd-dot amber"></span>
                  Pendiente: <strong>{{ fmt(pendiente()) }}</strong>
                </span>
              </div>
            </div>
          </div>

          <div class="portal-grid">
            <!-- Pagos recibidos -->
            <div class="portal-panel">
              <h2 class="panel-title">Pagos recibidos</h2>
              @if (pagoSvc.pagos().length === 0) {
                <p class="empty">Sin pagos registrados todavía</p>
              } @else {
                @for (pago of pagoSvc.pagos(); track pago.id; let i = $index) {
                  <div class="pago-item">
                    <div class="pago-num">{{ i + 1 }}</div>
                    <div class="pago-info">
                      <span class="pago-monto">{{ fmt(pago.monto) }}</span>
                      @if (pago.nota) { <span class="pago-nota">{{ pago.nota }}</span> }
                    </div>
                    <span class="pago-fecha">{{ fd(pago.fecha) }}</span>
                  </div>
                }
              }
            </div>

            <!-- Entregables -->
            <div class="portal-panel">
              <h2 class="panel-title">Archivos y entregables</h2>
              @if (entSvc.entregables().length === 0) {
                <p class="empty">Sin entregables todavía</p>
              } @else {
                @for (e of entSvc.entregables(); track e.id) {
                  <a [href]="e.url" target="_blank" class="ent-item">
                    <span class="ent-tipo">{{ e.tipo }}</span>
                    <span class="ent-nombre">{{ e.nombre }}</span>
                    <span class="ent-arrow">↗</span>
                  </a>
                }
              }
            </div>
          </div>

          @if (proyecto()!.fecha_entrega) {
            <div class="delivery-banner">
              <span class="delivery-icon">📅</span>
              <div>
                <span class="delivery-label">Fecha de entrega estimada</span>
                <span class="delivery-date">{{ fd(proyecto()!.fecha_entrega!) }}</span>
              </div>
            </div>
          }

          <div class="portal-footer">
            <span>Generado por APA Dashboard</span>
            <span>·</span>
            <span>{{ proyecto()!.clientes?.empresa }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

    .portal {
      min-height: 100vh;
      background: #0a0a0f;
      font-family: 'DM Sans', sans-serif;
      -webkit-font-smoothing: antialiased;
      padding: 0;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .center { display: flex; justify-content: center; align-items: center; min-height: 100vh; width: 100%; }
    .spin { width: 28px; height: 28px; border: 2px solid rgba(255,255,255,.1); border-top-color: #7c6af7; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .not-found { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 12px; color: #64748b; text-align: center; }
    .nf-icon { font-size: 3rem; }
    .not-found h1 { color: #f1f5f9; font-size: 1.5rem; font-weight: 600; }
    .not-found p { font-size: 14px; }

    .wrap { width: 100%; max-width: 700px; padding: 40px 24px 60px; }

    /* Header */
    .portal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
    .agency-badge { font-size: 14px; font-weight: 700; color: #a5b4fc; letter-spacing: -.01em; }
    .portal-label { font-size: 12px; color: #475569; }

    /* Card principal */
    .proj-card { background: #111118; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 24px; margin-bottom: 16px; }
    .proj-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; }
    .proj-name { font-size: 1.5rem; font-weight: 600; color: #f1f5f9; letter-spacing: -.03em; margin-bottom: 4px; }
    .proj-client { font-size: 14px; color: #a5b4fc; font-weight: 500; margin-bottom: 8px; }
    .proj-desc { font-size: 13px; color: #64748b; line-height: 1.6; }
    .estado-badge { padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; border: 1px solid; white-space: nowrap; flex-shrink: 0; }

    /* Progress */
    .progress-section { }
    .progress-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .progress-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; font-weight: 500; }
    .progress-pct { font-size: 14px; font-weight: 600; color: #a5b4fc; font-family: 'DM Mono', monospace; }
    .progress-track { height: 7px; background: rgba(255,255,255,.06); border-radius: 999px; overflow: hidden; margin-bottom: 12px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #7c6af7, #9d8fff); border-radius: 999px; transition: width .5s; }
    .progress-detail { display: flex; gap: 20px; }
    .pd-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #94a3b8; }
    .pd-item strong { color: #e2e8f0; }
    .pd-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .pd-dot.green { background: #34d399; }
    .pd-dot.amber { background: #fbbf24; }

    /* Grid */
    .portal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }

    .portal-panel { background: #111118; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 18px; }
    .panel-title { font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 14px; }
    .empty { font-size: 13px; color: #475569; text-align: center; padding: 16px 0; }

    /* Pagos */
    .pago-item { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,.04); }
    .pago-item:last-child { border-bottom: none; }
    .pago-num { width: 20px; height: 20px; border-radius: 5px; background: rgba(255,255,255,.04); color: #64748b; font-size: 11px; font-family: 'DM Mono', monospace; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pago-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .pago-monto { font-size: 14px; font-weight: 600; color: #34d399; font-family: 'DM Mono', monospace; }
    .pago-nota { font-size: 11.5px; color: #64748b; }
    .pago-fecha { font-size: 11px; color: #475569; font-family: 'DM Mono', monospace; white-space: nowrap; }

    /* Entregables */
    .ent-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; background: rgba(255,255,255,.02); text-decoration: none; margin-bottom: 5px; transition: background .15s; }
    .ent-item:hover { background: rgba(124,106,247,.1); }
    .ent-tipo { font-size: 10px; text-transform: uppercase; color: #64748b; background: rgba(255,255,255,.05); padding: 2px 7px; border-radius: 4px; letter-spacing: .06em; flex-shrink: 0; }
    .ent-nombre { flex: 1; font-size: 13.5px; color: #e2e8f0; }
    .ent-arrow { font-size: 13px; color: #a5b4fc; }

    /* Delivery banner */
    .delivery-banner { display: flex; align-items: center; gap: 14px; background: rgba(251,191,36,.06); border: 1px solid rgba(251,191,36,.15); border-radius: 12px; padding: 14px 18px; margin-bottom: 12px; }
    .delivery-icon { font-size: 1.25rem; }
    .delivery-label { display: block; font-size: 11px; text-transform: uppercase; color: #92400e; letter-spacing: .06em; margin-bottom: 2px; }
    .delivery-date { font-size: 15px; font-weight: 600; color: #fbbf24; font-family: 'DM Mono', monospace; }

    /* Footer */
    .portal-footer { display: flex; gap: 8px; align-items: center; justify-content: center; font-size: 12px; color: #334155; padding-top: 24px; }
  `]
})
export class PortalComponent implements OnInit {
  private route = inject(ActivatedRoute);
  svc     = inject(ProyectoService);
  pagoSvc = inject(PagoService);
  entSvc  = inject(EntregableService);
  horaSvc = inject(HoraService);

  META    = META;
  loading = signal(true);
  proyecto = signal<Proyecto | null>(null);

  pct      = () => {
    const p = this.proyecto();
    if (!p || !p.presupuesto) return 0;
    return Math.min(100, Math.round((p.monto_cobrado / p.presupuesto) * 100));
  };
  pendiente = () => {
    const p = this.proyecto();
    return p ? Math.max(0, p.presupuesto - p.monto_cobrado) : 0;
  };

  async ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token')!;
    try {
      const p = await this.svc.loadByToken(token);
      this.proyecto.set(p);
      if (p) {
        await Promise.all([
          this.pagoSvc.loadByProyecto(p.id),
          this.entSvc.loadByProyecto(p.id),
        ]);
      }
    } catch { this.proyecto.set(null); }
    finally { this.loading.set(false); }
  }

  fmt(n: number) {
    return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(n);
  }
  fd(iso: string) {
    return new Date(iso + 'T00:00').toLocaleDateString('es-AR', { day:'numeric', month:'long', year:'numeric' });
  }
}
