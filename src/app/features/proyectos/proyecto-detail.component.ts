import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProyectoService } from '../../core/services/proyecto.service';
import { PagoService } from '../../core/services/pago.service';
import { Proyecto, EstadoProyecto } from '../../core/models';

const META: Record<EstadoProyecto, { label: string; color: string; bg: string }> = {
  EN_PROGRESO: { label: 'En progreso', color: 'var(--blue)',  bg: 'var(--blue-bg)'  },
  PAUSADO:     { label: 'Pausado',     color: 'var(--amber)', bg: 'var(--amber-bg)' },
  COMPLETADO:  { label: 'Completado',  color: 'var(--green)', bg: 'var(--green-bg)' },
  CANCELADO:   { label: 'Cancelado',   color: 'var(--red)',   bg: 'var(--red-bg)'   },
};

const TRANS: Record<EstadoProyecto, EstadoProyecto[]> = {
  EN_PROGRESO: ['PAUSADO','COMPLETADO','CANCELADO'],
  PAUSADO:     ['EN_PROGRESO','CANCELADO'],
  COMPLETADO:  [],
  CANCELADO:   [],
};

@Component({
  selector: 'app-proyecto-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <a routerLink="/proyectos">Proyectos</a>
        <span class="sep">/</span>
        <span>{{ proyecto()?.nombre ?? '...' }}</span>
      </div>

      @if (!proyecto()) {
        <div class="loading">
          <div class="spin"></div>
        </div>
      } @else {
        <!-- Header del proyecto -->
        <div class="proj-header">
          <div class="proj-meta">
            <h1 class="proj-title">{{ proyecto()!.nombre }}</h1>
            <div class="proj-sub">
              <span class="proj-client">{{ proyecto()!.clientes?.empresa }}</span>
              <span class="proj-dot">·</span>
              <span class="badge"
                [style.color]="META[proyecto()!.estado].color"
                [style.background]="META[proyecto()!.estado].bg">
                {{ META[proyecto()!.estado].label }}
              </span>
              @if (proyecto()!.fecha_entrega) {
                <span class="proj-dot">·</span>
                <span class="proj-date">{{ fmtDate(proyecto()!.fecha_entrega!) }}</span>
              }
            </div>
          </div>
        </div>

        <!-- Métricas principales -->
        <div class="metrics-row">
          <div class="metric">
            <span class="metric-label">Presupuesto total</span>
            <span class="metric-val">{{ fmt(proyecto()!.presupuesto) }}</span>
          </div>
          <div class="metric-div"></div>
          <div class="metric">
            <span class="metric-label">Monto cobrado</span>
            <span class="metric-val green">{{ fmt(proyecto()!.monto_cobrado) }}</span>
          </div>
          <div class="metric-div"></div>
          <div class="metric">
            <span class="metric-label">Saldo pendiente</span>
            <span class="metric-val" [class.amber]="proyecto()!.presupuesto - proyecto()!.monto_cobrado > 0">
              {{ fmt(proyecto()!.presupuesto - proyecto()!.monto_cobrado) }}
            </span>
          </div>
          <div class="metric-div"></div>
          <div class="metric">
            <span class="metric-label">Porcentaje cobrado</span>
            <div class="metric-pct-wrap">
              <div class="metric-track">
                <div class="metric-fill" [style.width.%]="pct()"
                  [style.background]="pct() >= 100 ? 'var(--green)' : 'var(--accent)'">
                </div>
              </div>
              <span class="metric-val">{{ pct() }}%</span>
            </div>
          </div>
        </div>

        <!-- Main content -->
        <div class="content-grid">

          <!-- Pagos -->
          <div class="panel">
            <div class="panel-head">
              <h2 class="panel-title">Historial de pagos</h2>
              <button class="btn-outline" (click)="showForm.set(!showForm())">
                @if (showForm()) {
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Cancelar
                } @else {
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Registrar pago
                }
              </button>
            </div>

            @if (showForm()) {
              <form [formGroup]="pagoForm" (ngSubmit)="registrar()" class="pago-form">
                <div class="pf-row">
                  <div class="pf-field">
                    <label>Monto (ARS) <span class="req">*</span></label>
                    <input formControlName="monto" type="number" placeholder="50000" />
                  </div>
                  <div class="pf-field">
                    <label>Fecha</label>
                    <input formControlName="fecha" type="date" />
                  </div>
                </div>
                <div class="pf-field">
                  <label>Descripción del pago</label>
                  <input formControlName="nota" placeholder="Anticipo 50%, saldo final, cuota 2/3..." />
                </div>
                @if (pagoErr()) { <div class="err-sm">{{ pagoErr() }}</div> }
                <button type="submit" class="cta-sm" [disabled]="savingPago()">
                  @if (savingPago()) { Registrando... } @else { Confirmar pago }
                </button>
              </form>
            }

            <!-- Lista de pagos -->
            @if (pagoSvc.loading()) {
              <div class="pago-sk"></div>
            } @else if (pagoSvc.pagos().length === 0) {
              <div class="empty-pagos">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <span>Sin pagos registrados</span>
              </div>
            } @else {
              <div class="pagos">
                @for (pago of pagoSvc.pagos(); track pago.id; let i = $index) {
                  <div class="pago-row">
                    <div class="pago-num">{{ i + 1 }}</div>
                    <div class="pago-info">
                      <span class="pago-monto">{{ fmt(pago.monto) }}</span>
                      @if (pago.nota) { <span class="pago-nota">{{ pago.nota }}</span> }
                    </div>
                    <span class="pago-fecha">{{ fmtDate(pago.fecha) }}</span>
                    <button class="del-btn" (click)="deletePago(pago.id)">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      </svg>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Acciones -->
          <div class="side">
            @if (TRANS[proyecto()!.estado].length > 0) {
              <div class="panel">
                <h2 class="panel-title">Cambiar estado</h2>
                <div class="trans-list">
                  @for (e of TRANS[proyecto()!.estado]; track e) {
                    <button class="trans-btn" [disabled]="transitioning()"
                            (click)="cambiarEstado(e)">
                      <span class="trans-dot" [style.background]="META[e].color"></span>
                      Mover a {{ META[e].label }}
                      <svg class="trans-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  }
                </div>
              </div>
            }

            @if (proyecto()!.descripcion) {
              <div class="panel">
                <h2 class="panel-title">Descripción</h2>
                <p class="desc">{{ proyecto()!.descripcion }}</p>
              </div>
            }

            <div class="panel info-panel">
              <h2 class="panel-title">Información</h2>
              <div class="info-rows">
                <div class="info-row">
                  <span class="info-key">Cliente</span>
                  <span class="info-val">{{ proyecto()!.clientes?.empresa }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">Inicio</span>
                  <span class="info-val mono">{{ fmtDate(proyecto()!.fecha_inicio) }}</span>
                </div>
                @if (proyecto()!.fecha_entrega) {
                  <div class="info-row">
                    <span class="info-key">Entrega</span>
                    <span class="info-val mono">{{ fmtDate(proyecto()!.fecha_entrega!) }}</span>
                  </div>
                }
                <div class="info-row">
                  <span class="info-key">Pagos</span>
                  <span class="info-val">{{ pagoSvc.pagos().length }} registrado{{ pagoSvc.pagos().length !== 1 ? 's' : '' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 900px; }
    .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-3); margin-bottom: 20px; }
    .breadcrumb a { color: var(--ink-3); transition: color 0.15s; }
    .breadcrumb a:hover { color: var(--accent-2); }
    .sep { color: var(--ink-3); opacity: 0.4; }

    .loading { display: flex; justify-content: center; padding: 60px; }
    .spin { width: 28px; height: 28px; border: 2px solid var(--line-2); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Header */
    .proj-header { margin-bottom: 20px; }
    .proj-title { font-size: 1.75rem; font-weight: 600; color: var(--ink); letter-spacing: -0.03em; margin-bottom: 8px; }
    .proj-sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .proj-client { font-size: 13.5px; color: var(--ink-2); font-weight: 500; }
    .proj-dot { color: var(--ink-3); font-size: 10px; }
    .proj-date { font-size: 12.5px; color: var(--ink-3); font-family: var(--mono); }
    .badge { padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 500; }

    /* Métricas */
    .metrics-row {
      display: flex;
      align-items: center;
      background: var(--bg-2);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 18px 24px;
      margin-bottom: 18px;
      gap: 0;
    }
    .metric { flex: 1; }
    .metric-div { width: 1px; height: 40px; background: var(--line); margin: 0 24px; flex-shrink: 0; }
    .metric-label { display: block; font-size: 11px; font-weight: 500; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .metric-val { font-size: 1.2rem; font-weight: 600; color: var(--ink); font-family: var(--mono); letter-spacing: -0.02em; }
    .metric-val.green { color: var(--green); }
    .metric-val.amber { color: var(--amber); }
    .metric-pct-wrap { display: flex; align-items: center; gap: 10px; }
    .metric-track { flex: 1; height: 5px; background: var(--bg-3); border-radius: 999px; overflow: hidden; max-width: 80px; }
    .metric-fill { height: 100%; border-radius: 999px; transition: width 0.5s; }

    /* Content */
    .content-grid { display: grid; grid-template-columns: 1fr 240px; gap: 12px; align-items: start; }

    .panel {
      background: var(--bg-2);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 18px;
      margin-bottom: 10px;
    }
    .panel:last-child { margin-bottom: 0; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .panel-title { font-size: 13px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em; margin: 0 0 14px; }
    .panel-head .panel-title { margin: 0; }

    .btn-outline { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: none; border: 1px solid var(--line-2); border-radius: var(--radius); color: var(--ink-2); font-size: 12px; cursor: pointer; transition: all 0.15s; }
    .btn-outline:hover { border-color: var(--accent); color: var(--accent-2); }

    /* Pago form */
    .pago-form { background: var(--bg-3); border-radius: var(--radius); padding: 14px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
    .pf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .pf-field { display: flex; flex-direction: column; gap: 5px; }
    .pf-field label { font-size: 11.5px; font-weight: 500; color: var(--ink-2); }
    .req { color: var(--accent-2); }
    .pf-field input { padding: 8px 11px; background: var(--bg-1); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); font-size: 13.5px; font-family: var(--font); }
    .pf-field input:focus { outline: none; border-color: var(--accent); }
    .err-sm { font-size: 12px; color: var(--red); background: var(--red-bg); padding: 7px 10px; border-radius: 7px; }
    .cta-sm { padding: 8px 14px; background: var(--accent); border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 500; cursor: pointer; align-self: flex-start; }
    .cta-sm:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Pagos list */
    .pago-sk { height: 50px; border-radius: 8px; background: linear-gradient(90deg,var(--bg-3) 25%,var(--bg-2) 50%,var(--bg-3) 75%); background-size: 200% 100%; animation: shimmer 1.4s ease infinite; }
    @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }

    .empty-pagos { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; color: var(--ink-3); font-size: 13px; }

    .pagos { display: flex; flex-direction: column; gap: 1px; }
    .pago-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 10px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .pago-row:hover { background: var(--bg-3); }
    .pago-row:hover .del-btn { opacity: 1; }

    .pago-num { width: 20px; height: 20px; border-radius: 5px; background: var(--bg-3); color: var(--ink-3); font-size: 11px; font-family: var(--mono); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pago-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .pago-monto { font-size: 14px; font-weight: 600; color: var(--green); font-family: var(--mono); }
    .pago-nota  { font-size: 11.5px; color: var(--ink-3); }
    .pago-fecha { font-size: 11.5px; color: var(--ink-3); font-family: var(--mono); white-space: nowrap; }
    .del-btn { background: none; border: none; cursor: pointer; color: var(--ink-3); padding: 4px; border-radius: 5px; opacity: 0; transition: all 0.15s; display: flex; }
    .del-btn:hover { color: var(--red); background: var(--red-bg); }

    /* Transiciones */
    .trans-list { display: flex; flex-direction: column; gap: 4px; }
    .trans-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: var(--radius);
      background: var(--bg-3); border: 1px solid var(--line);
      color: var(--ink-2); font-size: 12.5px;
      cursor: pointer; transition: all 0.15s;
      width: 100%;
    }
    .trans-btn:hover { border-color: var(--line-2); color: var(--ink); background: var(--bg-2); }
    .trans-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .trans-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .trans-arrow { margin-left: auto; color: var(--ink-3); }

    /* Descripción */
    .desc { font-size: 13px; color: var(--ink-2); line-height: 1.65; }

    /* Info panel */
    .info-rows { display: flex; flex-direction: column; gap: 0; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--line); }
    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
    .info-key { font-size: 11.5px; color: var(--ink-3); }
    .info-val { font-size: 12.5px; color: var(--ink-2); font-weight: 500; }
    .info-val.mono { font-family: var(--mono); font-size: 12px; }
  `]
})
export class ProyectoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  svc     = inject(ProyectoService);
  pagoSvc = inject(PagoService);
  private fb = inject(FormBuilder);

  META   = META;
  TRANS  = TRANS;

  proyecto      = signal<Proyecto | null>(null);
  showForm      = signal(false);
  savingPago    = signal(false);
  transitioning = signal(false);
  pagoErr       = signal('');

  pagoForm = this.fb.group({
    monto: [null as number | null, [Validators.required, Validators.min(1)]],
    fecha: [new Date().toISOString().split('T')[0]],
    nota:  [''],
  });

  pct = computed(() => {
    const p = this.proyecto();
    if (!p || !p.presupuesto) return 0;
    return Math.min(100, Math.round((p.monto_cobrado / p.presupuesto) * 100));
  });

  get id() { return this.route.snapshot.paramMap.get('id')!; }

  async ngOnInit() {
    await this.svc.loadAll();
    this.proyecto.set(this.svc.proyectos().find(p => p.id === this.id) ?? null);
    await this.pagoSvc.loadByProyecto(this.id);
  }

  async registrar() {
    if (this.pagoForm.invalid) return;
    this.savingPago.set(true);
    this.pagoErr.set('');
    try {
      await this.pagoSvc.registrar({ ...this.pagoForm.value as any, proyecto_id: this.id });
      await this.svc.loadAll();
      this.proyecto.set(this.svc.proyectos().find(p => p.id === this.id) ?? null);
      this.pagoForm.patchValue({ monto: null, nota: '' });
      this.showForm.set(false);
    } catch (e: any) { this.pagoErr.set(e.message ?? 'Error'); }
    finally { this.savingPago.set(false); }
  }

  async deletePago(pagoId: string) {
    if (!confirm('¿Eliminar este pago?')) return;
    await this.pagoSvc.delete(pagoId);
    await this.svc.loadAll();
    this.proyecto.set(this.svc.proyectos().find(p => p.id === this.id) ?? null);
  }

  async cambiarEstado(e: EstadoProyecto) {
    this.transitioning.set(true);
    await this.svc.updateEstado(this.id, e);
    this.proyecto.set(this.svc.proyectos().find(p => p.id === this.id) ?? null);
    this.transitioning.set(false);
  }

  fmt(n: number) {
    return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(n);
  }

  fmtDate(iso: string) {
    return new Date(iso + 'T00:00').toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' });
  }
}
