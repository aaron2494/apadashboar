import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProyectoService } from '../../core/services/proyecto.service';
import { ClienteService } from '../../core/services/cliente.service';
import { Proyecto, EstadoProyecto } from '../../core/models';

const META: Record<EstadoProyecto, { label: string; color: string; bg: string }> = {
  EN_PROGRESO: { label: 'En progreso', color: 'var(--blue)',  bg: 'var(--blue-bg)'  },
  PAUSADO:     { label: 'Pausado',     color: 'var(--amber)', bg: 'var(--amber-bg)' },
  COMPLETADO:  { label: 'Completado',  color: 'var(--green)', bg: 'var(--green-bg)' },
  CANCELADO:   { label: 'Cancelado',   color: 'var(--red)',   bg: 'var(--red-bg)'   },
};

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [RouterLink, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <p class="eyebrow">Cartera de trabajo</p>
          <h1 class="page-title">Proyectos</h1>
        </div>
        <div class="head-actions">
          <!-- Toggle archivados -->
          <button class="btn-toggle" [class.active]="mostrarArchivados()"
                  (click)="toggleArchivados()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
              <line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
            {{ mostrarArchivados() ? 'Ocultar archivados' : 'Ver archivados' }}
          </button>
          <button class="btn-export" (click)="exportarCSV()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar CSV
          </button>
          <button class="cta" (click)="openModal()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo proyecto
          </button>
        </div>
      </div>

      <!-- Alertas de cobros vencidos -->
      @if (alertas().length > 0) {
        <div class="alertas-wrap">
          <div class="alertas-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {{ alertas().length }} cobro{{ alertas().length > 1 ? 's' : '' }} con saldo pendiente hace más de 30 días
          </div>
          <div class="alertas-list">
            @for (a of alertas(); track a.proyectoId) {
              <div class="alerta-item">
                <span class="alerta-nombre">{{ a.proyectoNombre }}</span>
                <span class="alerta-cliente">{{ a.clienteEmpresa }}</span>
                <span class="alerta-monto">{{ fmt(a.pendiente) }} pendiente</span>
                <span class="alerta-dias">hace {{ a.diasDesdeUltimoPago }} días</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Filtros pill -->
      <div class="filters">
        @for (f of filtros; track f.value) {
          <button class="pill" [class.active]="filtro() === f.value"
                  (click)="filtro.set(f.value)">
            {{ f.label }}
            <span class="pill-count">{{ counts()[f.value] || 0 }}</span>
          </button>
        }
        <!-- Toggle cancelados -->
        <button class="pill pill-toggle" [class.active]="mostrarCancelados()"
                (click)="toggleCancelados()">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            @if (mostrarCancelados()) {
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            } @else {
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            }
          </svg>
          Cancelados
        </button>
      </div>

      @if (showModal()) {
        <div class="overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h2>{{ editId() ? 'Editar proyecto' : 'Nuevo proyecto' }}</h2>
              <button class="close-btn" (click)="closeModal()">✕</button>
            </div>
            <form [formGroup]="form" (ngSubmit)="guardar()">
              <div class="field full">
                <label>Nombre del proyecto <span class="req">*</span></label>
                <input formControlName="nombre" placeholder="Sitio web corporativo" />
              </div>
              <div class="form-grid">
                <div class="field">
                  <label>Cliente <span class="req">*</span></label>
                  <select formControlName="cliente_id">
                    <option value="">Seleccionar...</option>
                    @for (c of clienteSvc.clientes(); track c.id) {
                      <option [value]="c.id">{{ c.empresa }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label>Estado</label>
                  <select formControlName="estado">
                    @for (e of estados; track e) {
                      <option [value]="e">{{ META[e].label }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label>Presupuesto (ARS)</label>
                  <input formControlName="presupuesto" type="number" placeholder="0" />
                </div>
                <div class="field">
                  <label>Fecha de entrega</label>
                  <input formControlName="fecha_entrega" type="date" />
                </div>
              </div>
              <div class="field full">
                <label>Descripción</label>
                <textarea formControlName="descripcion" rows="2"></textarea>
              </div>
              @if (modalError()) { <div class="err">{{ modalError() }}</div> }
              <div class="modal-foot">
                <button type="button" class="btn-ghost" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="cta" [disabled]="saving()">
                  @if (saving()) { Guardando... } @else { Guardar }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (svc.loading()) {
        <div class="table-wrap">
          @for (i of [1,2,3,4]; track i) { <div class="row-sk"></div> }
        </div>
      } @else if (filtrados().length === 0) {
        <div class="empty">
          <div class="empty-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <p>{{ mostrarArchivados() ? 'No hay proyectos archivados' : 'No hay proyectos con este estado' }}</p>
        </div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th class="r">Presupuesto</th>
                <th class="r">Cobrado</th>
                <th class="r">Pendiente</th>
                <th class="r">Avance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (p of filtrados(); track p.id) {
                <tr [class.row-archived]="p.archivado">
                  <td>
                    <a [routerLink]="['/proyectos', p.id]" class="proj-link">
                      {{ p.nombre }}
                    </a>
                    <div class="chips">
                      @if (p.fecha_entrega) {
                        <span class="date-chip">{{ fmtDate(p.fecha_entrega) }}</span>
                      }
                      @if (p.archivado) {
                        <span class="arch-chip">archivado</span>
                      }
                      @if (estaVencido(p)) {
                        <span class="venc-chip">⚠ cobro pendiente</span>
                      }
                    </div>
                  </td>
                  <td class="client-cell">{{ p.clientes?.empresa }}</td>
                  <td>
                    <span class="badge"
                      [style.color]="META[p.estado].color"
                      [style.background]="META[p.estado].bg">
                      {{ META[p.estado].label }}
                    </span>
                  </td>
                  <td class="r mono">{{ fmt(p.presupuesto) }}</td>
                  <td class="r mono green">{{ fmt(p.monto_cobrado) }}</td>
                  <td class="r mono" [class.red]="p.presupuesto - p.monto_cobrado > 0">
                    {{ fmt(p.presupuesto - p.monto_cobrado) }}
                  </td>
                  <td class="r">
                    <div class="mini-bar">
                      <div class="mini-fill"
                        [style.width.%]="pct(p)"
                        [style.background]="pct(p) >= 100 ? 'var(--green)' : 'var(--accent)'">
                      </div>
                    </div>
                    <span class="pct-text">{{ pct(p) }}%</span>
                  </td>
                  <td>
                    <div class="row-actions">
                      @if (!p.archivado) {
                        <button class="icon-btn" (click)="openEdit(p)" title="Editar">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button class="icon-btn warn" (click)="archivar(p)" title="Archivar">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="21 8 21 21 3 21 3 8"/>
                            <rect x="1" y="3" width="22" height="5"/>
                            <line x1="10" y1="12" x2="14" y2="12"/>
                          </svg>
                        </button>
                      } @else {
                        <button class="icon-btn ok" (click)="desarchivar(p.id)" title="Desarchivar">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="1 4 1 10 7 10"/>
                            <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
                          </svg>
                        </button>
                        <button class="icon-btn danger" (click)="borrarPermanente(p.id)" title="Borrar definitivamente">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          </svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1020px; }
    .page-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 16px; }
    .eyebrow { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent-2); margin-bottom: 4px; }
    .page-title { font-size: 1.625rem; font-weight: 600; color: var(--ink); letter-spacing: -0.03em; }
    .head-actions { display: flex; gap: 8px; align-items: center; }

    .cta { display: flex; align-items: center; gap: 7px; padding: 9px 16px; background: var(--accent); border: none; border-radius: var(--radius); color: white; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; white-space: nowrap; }
    .cta:hover { opacity: 0.88; }
    .cta:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-toggle, .btn-export {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 14px; border-radius: var(--radius);
      border: 1px solid var(--line-2); background: none;
      color: var(--ink-3); font-size: 12.5px; cursor: pointer;
      transition: all 0.15s; white-space: nowrap;
    }
    .btn-toggle:hover { color: var(--amber); border-color: rgba(251,191,36,0.3); background: var(--amber-bg); }
    .btn-toggle.active { color: var(--amber); border-color: rgba(251,191,36,0.4); background: var(--amber-bg); }
    .btn-export:hover { color: var(--green); border-color: rgba(52,211,153,0.3); background: var(--green-bg); }

    /* Alertas de cobros vencidos */
    .alertas-wrap {
      background: rgba(251,191,36,0.06);
      border: 1px solid rgba(251,191,36,0.2);
      border-radius: var(--radius-lg);
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .alertas-header {
      display: flex; align-items: center; gap: 8px;
      font-size: 12.5px; font-weight: 600; color: var(--amber);
      margin-bottom: 10px;
    }
    .alertas-list { display: flex; flex-direction: column; gap: 6px; }
    .alerta-item {
      display: flex; align-items: center; gap: 12px;
      font-size: 12.5px; padding: 7px 10px;
      background: rgba(251,191,36,0.04); border-radius: 7px;
    }
    .alerta-nombre { font-weight: 500; color: var(--ink-2); flex: 1; }
    .alerta-cliente { color: var(--ink-3); flex: 1; }
    .alerta-monto { font-family: var(--mono); font-size: 12px; color: var(--amber); font-weight: 500; }
    .alerta-dias { font-size: 11px; color: var(--ink-3); white-space: nowrap; }

    /* Filtros */
    .filters { display: flex; gap: 6px; margin-bottom: 18px; flex-wrap: wrap; align-items: center; }
    .pill { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: none; color: var(--ink-3); font-size: 12.5px; cursor: pointer; transition: all 0.15s; }
    .pill:hover { border-color: var(--line-2); color: var(--ink-2); }
    .pill.active { background: rgba(124,106,247,0.12); border-color: rgba(124,106,247,0.3); color: var(--accent-2); }
    .pill-count { background: var(--bg-3); color: var(--ink-3); border-radius: 999px; padding: 1px 6px; font-size: 11px; }
    .pill.active .pill-count { background: rgba(124,106,247,0.2); color: var(--accent-2); }
    .pill-toggle { margin-left: auto; }
    .pill-toggle.active { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3); color: var(--red); }

    /* Table */
    .table-wrap { background: var(--bg-2); border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: var(--bg-3); }
    th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
    th.r { text-align: right; }
    td { padding: 12px 14px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--ink-2); vertical-align: middle; }
    tr:hover td { background: rgba(255,255,255,0.015); }
    tr.row-archived td { opacity: 0.55; }

    .proj-link { color: var(--ink); font-weight: 500; font-size: 13.5px; letter-spacing: -0.01em; display: block; }
    .proj-link:hover { color: var(--accent-2); }
    .chips { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 3px; }
    .date-chip { font-size: 11px; color: var(--ink-3); font-family: var(--mono); }
    .arch-chip { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--amber-bg); color: var(--amber); font-weight: 500; }
    .venc-chip { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--red-bg); color: var(--red); font-weight: 500; }
    .client-cell { color: var(--ink-3); font-size: 13px; }
    .badge { padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 500; }
    .r { text-align: right; }
    .mono { font-family: var(--mono); font-size: 12.5px; }
    .green { color: var(--green) !important; }
    .red { color: var(--red); }
    .mini-bar { width: 56px; height: 4px; background: var(--bg-3); border-radius: 999px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 6px; }
    .mini-fill { height: 100%; border-radius: 999px; transition: width 0.4s; }
    .pct-text { font-size: 11px; color: var(--ink-3); font-family: var(--mono); vertical-align: middle; }

    .row-actions { display: flex; gap: 3px; justify-content: flex-end; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--ink-3); padding: 5px; border-radius: 6px; display: flex; transition: all 0.15s; }
    .icon-btn:hover { background: var(--bg-3); color: var(--ink); }
    .icon-btn.warn:hover { background: var(--amber-bg); color: var(--amber); }
    .icon-btn.ok:hover { background: var(--green-bg); color: var(--green); }
    .icon-btn.danger:hover { background: var(--red-bg); color: var(--red); }

    .row-sk { height: 52px; border-top: 1px solid var(--line); animation: shimmer 1.4s ease infinite; background: linear-gradient(90deg,var(--bg-2) 25%,var(--bg-3) 50%,var(--bg-2) 75%); background-size: 200% 100%; }
    @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }
    .empty { text-align: center; padding: 60px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .empty-icon { width: 50px; height: 50px; border-radius: 13px; background: var(--bg-2); border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; color: var(--ink-3); }
    .empty p { font-size: 14px; color: var(--ink-3); }

    /* Modal */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .modal { background: var(--bg-2); border: 1px solid var(--line-2); border-radius: 18px; padding: 24px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
    .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .modal-head h2 { font-size: 15px; font-weight: 600; color: var(--ink); letter-spacing: -0.02em; }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--ink-3); font-size: 16px; padding: 4px 7px; border-radius: 6px; transition: all 0.15s; }
    .close-btn:hover { background: var(--bg-3); color: var(--ink); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .field.full { grid-column: 1/-1; }
    .field label { font-size: 12px; font-weight: 500; color: var(--ink-2); }
    .req { color: var(--accent-2); }
    .field input, .field select, .field textarea { padding: 9px 12px; background: var(--bg-1); border: 1px solid var(--line); border-radius: var(--radius); color: var(--ink); font-size: 13.5px; font-family: var(--font); resize: vertical; transition: border-color 0.15s; }
    .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--accent); }
    .err { background: var(--red-bg); border: 1px solid rgba(248,113,113,0.2); border-radius: var(--radius); color: var(--red); font-size: 13px; padding: 9px 12px; margin-bottom: 12px; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 8px; }
    .btn-ghost { padding: 9px 14px; border-radius: var(--radius); border: 1px solid var(--line-2); background: none; color: var(--ink-2); font-size: 13px; cursor: pointer; }
    .btn-ghost:hover { background: var(--bg-3); }
  `]
})
export class ProyectosComponent implements OnInit {
  svc        = inject(ProyectoService);
  clienteSvc = inject(ClienteService);
  private fb = inject(FormBuilder);

  META   = META;
  estados: EstadoProyecto[] = ['EN_PROGRESO','PAUSADO','COMPLETADO','CANCELADO'];
  filtros = [
    { value: '' as any,              label: 'Todos'       },
    { value: 'EN_PROGRESO' as const, label: 'En progreso' },
    { value: 'PAUSADO'     as const, label: 'Pausados'    },
    { value: 'COMPLETADO'  as const, label: 'Completados' },
  ];

  filtro           = signal<EstadoProyecto | ''>('');
  mostrarCancelados = signal(false);
  mostrarArchivados = signal(false);
  showModal        = signal(false);
  editId           = signal<string | null>(null);
  saving           = signal(false);
  modalError       = signal('');

  form = this.fb.group({
    nombre:        ['', Validators.required],
    cliente_id:    ['', Validators.required],
    estado:        ['EN_PROGRESO'],
    presupuesto:   [0],
    fecha_entrega: [''],
    descripcion:   [''],
  });

  // Proyectos filtrados por estado, cancelados y archivados
  filtrados = computed(() => {
    let lista = this.svc.proyectos();

    // Si se está viendo archivados, solo mostrar esos
    if (this.mostrarArchivados()) {
      return lista.filter(p => p.archivado);
    }

    // Ocultar archivados siempre en vista normal
    lista = lista.filter(p => !p.archivado);

    // Ocultar cancelados a menos que se active el toggle
    if (!this.mostrarCancelados()) {
      lista = lista.filter(p => p.estado !== 'CANCELADO');
    }

    // Filtro por estado
    const f = this.filtro();
    return f ? lista.filter(p => p.estado === f) : lista;
  });

  counts = computed(() => {
    const activos = this.svc.proyectos().filter(p => !p.archivado);
    const c: Record<string, number> = { '': activos.length };
    this.estados.forEach(e => { c[e] = activos.filter(p => p.estado === e).length; });
    return c;
  });

  // Alertas: proyectos con saldo pendiente y sin pagos en los últimos 30 días
  alertas = computed(() => {
    const HOY = new Date();
    return this.svc.proyectos()
      .filter(p => !p.archivado && p.estado === 'EN_PROGRESO' && p.presupuesto > p.monto_cobrado)
      .map(p => {
        const diasDesde = Math.floor(
          (HOY.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          proyectoId:          p.id,
          proyectoNombre:      p.nombre,
          clienteEmpresa:      p.clientes?.empresa ?? '',
          pendiente:           p.presupuesto - p.monto_cobrado,
          diasDesdeUltimoPago: diasDesde,
        };
      })
      .filter(a => a.diasDesdeUltimoPago >= 30);
  });

  toggleCancelados() { this.mostrarCancelados.set(!this.mostrarCancelados()); }

  ngOnInit() {
    this.svc.loadConArchivados();
    this.clienteSvc.loadAll();
  }

  async toggleArchivados() {
    this.mostrarArchivados.update(v => !v);
  }

  openModal()  { this.form.reset({ estado: 'EN_PROGRESO', presupuesto: 0 }); this.editId.set(null); this.showModal.set(true); }
  closeModal() { this.showModal.set(false); this.modalError.set(''); }

  openEdit(p: Proyecto) {
    this.editId.set(p.id);
    this.form.patchValue({ nombre: p.nombre, cliente_id: p.cliente_id, estado: p.estado, presupuesto: p.presupuesto, fecha_entrega: p.fecha_entrega ?? '', descripcion: p.descripcion ?? '' });
    this.showModal.set(true);
  }

  async guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    try {
      const body = this.form.value as any;
      if (this.editId()) await this.svc.update(this.editId()!, body);
      else await this.svc.create(body);
      this.closeModal();
    } catch (e: any) { this.modalError.set(e.message ?? 'Error'); }
    finally { this.saving.set(false); }
  }

  async archivar(p: Proyecto) {
    if (!confirm(`¿Archivar "${p.nombre}"? El proyecto se ocultará de la lista pero no se borrará.`)) return;
    await this.svc.archivar(p.id);
  }

  async desarchivar(id: string) {
    await this.svc.desarchivar(id);
  }

  async borrarPermanente(id: string) {
    if (!confirm('¿Borrar definitivamente? Esta acción no se puede deshacer y eliminará también los pagos y entregables.')) return;
    await this.svc.deletePermanente(id);
  }

  // Exportar a CSV — todo en el cliente, sin servidor
  exportarCSV() {
    const cols = ['Proyecto','Cliente','Estado','Presupuesto','Cobrado','Pendiente','Fecha entrega'];
    const rows = this.svc.proyectos()
      .filter(p => !p.archivado)
      .map(p => [
        p.nombre,
        p.clientes?.empresa ?? '',
        META[p.estado].label,
        p.presupuesto,
        p.monto_cobrado,
        p.presupuesto - p.monto_cobrado,
        p.fecha_entrega ?? '',
      ]);

    const csv = [cols, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `proyectos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  estaVencido(p: Proyecto): boolean {
    if (p.estado !== 'EN_PROGRESO' || p.presupuesto <= p.monto_cobrado) return false;
    const dias = Math.floor(
      (new Date().getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return dias >= 30;
  }

  pct(p: Proyecto) {
    if (!p.presupuesto) return 0;
    return Math.min(100, Math.round((p.monto_cobrado / p.presupuesto) * 100));
  }

  fmt(n: number) {
    return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(n);
  }

  fmtDate(iso: string) {
    return new Date(iso + 'T00:00').toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' });
  }
}
