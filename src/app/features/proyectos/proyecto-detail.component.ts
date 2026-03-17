import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProyectoService } from '../../core/services/proyecto.service';
import { PagoService } from '../../core/services/pago.service';
import { EntregableService } from '../../core/services/entregable.service';
import { HoraService, CATEGORIAS } from '../../core/services/hora.service';
import { Proyecto, EstadoProyecto, ItemPresupuesto, TipoEntregable, CategoriaHora } from '../../core/models';

const META: Record<EstadoProyecto, { label: string; color: string; bg: string }> = {
  EN_PROGRESO: { label: 'En progreso', color: 'var(--blue)',  bg: 'var(--blue-bg)'  },
  PAUSADO:     { label: 'Pausado',     color: 'var(--amber)', bg: 'var(--amber-bg)' },
  COMPLETADO:  { label: 'Completado',  color: 'var(--green)', bg: 'var(--green-bg)' },
  CANCELADO:   { label: 'Cancelado',   color: 'var(--red)',   bg: 'var(--red-bg)'   },
};

const TRANS: Record<EstadoProyecto, EstadoProyecto[]> = {
  EN_PROGRESO: ['PAUSADO', 'COMPLETADO', 'CANCELADO'],
  PAUSADO:     ['EN_PROGRESO', 'CANCELADO'],
  COMPLETADO:  [],
  CANCELADO:   [],
};

const TIPO_ICONS: Record<TipoEntregable, string> = {
  figma:     'F', drive: 'G', notion: 'N',
  github:    '<>', link: '↗'
};

const TIPO_COLORS: Record<TipoEntregable, string> = {
  figma: '#a78bfa', drive: '#34d399', notion: '#94a3b8',
  github: '#f87171', link: '#60a5fa'
};

@Component({
  selector: 'app-proyecto-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, ReactiveFormsModule],
  template: `
<div class="page">
  <!-- Breadcrumb -->
  <div class="bc">
    <a routerLink="/proyectos">Proyectos</a>
    <span>/</span>
    <span>{{ proyecto()?.nombre ?? '...' }}</span>
  </div>

  @if (!proyecto()) {
    <div class="center-load"><div class="spin"></div></div>
  } @else {

    <!-- Header -->
    <div class="proj-hd">
      <div>
        <h1 class="proj-title">{{ proyecto()!.nombre }}</h1>
        <div class="proj-meta">
          <span class="proj-client">{{ proyecto()!.clientes?.empresa }}</span>
          <span class="sep">·</span>
          <span class="badge" [style.color]="META[proyecto()!.estado].color" [style.background]="META[proyecto()!.estado].bg">
            {{ META[proyecto()!.estado].label }}
          </span>
          @if (proyecto()!.fecha_entrega) {
            <span class="sep">·</span>
            <span class="date-chip">Entrega: {{ fd(proyecto()!.fecha_entrega!) }}</span>
          }
        </div>
      </div>
      <div class="hd-actions">
        <button class="btn-outline" (click)="copyPortal()">
          {{ copied() ? '✓ Copiado' : '⎘ Link cliente' }}
        </button>
        <button class="btn-outline" (click)="generarPDF()">↓ Presupuesto PDF</button>
      </div>
    </div>

    <!-- Métricas rápidas -->
    <div class="metrics">
      <div class="metric">
        <span class="m-label">Presupuesto</span>
        <span class="m-val">{{ fmt(proyecto()!.presupuesto) }}</span>
      </div>
      <div class="m-div"></div>
      <div class="metric">
        <span class="m-label">Cobrado</span>
        <span class="m-val green">{{ fmt(proyecto()!.monto_cobrado) }}</span>
      </div>
      <div class="m-div"></div>
      <div class="metric">
        <span class="m-label">Pendiente</span>
        <span class="m-val" [class.amber]="pendiente() > 0">{{ fmt(pendiente()) }}</span>
      </div>
      <div class="m-div"></div>
      <div class="metric">
        <span class="m-label">Horas totales</span>
        <span class="m-val">{{ horaSvc.totalHoras() }}h</span>
      </div>
      <div class="m-div"></div>
      <div class="metric">
        <span class="m-label">Rentabilidad/h</span>
        <span class="m-val" [class.green]="rentabilidad() > 0">
          {{ horaSvc.totalHoras() > 0 ? fmt(rentabilidad()) : '—' }}
        </span>
      </div>
      <div class="m-div"></div>
      <div class="metric pct-metric">
        <span class="m-label">Cobro</span>
        <div class="pct-row-m">
          <div class="mini-track"><div class="mini-fill" [style.width.%]="pct()"></div></div>
          <span class="m-val">{{ pct() }}%</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      @for (tab of tabs; track tab.id) {
        <button class="tab" [class.active]="activeTab() === tab.id"
                (click)="activeTab.set(tab.id)">
          {{ tab.label }}
        </button>
      }
    </div>

    <!-- ══ TAB: PAGOS ══════════════════════════════════════ -->
    @if (activeTab() === 'pagos') {
      <div class="panel">
        <div class="panel-hd">
          <h2 class="panel-title">Historial de pagos</h2>
          <button class="btn-sm" (click)="showPagoForm.set(!showPagoForm())">
            {{ showPagoForm() ? '✕ Cancelar' : '+ Registrar pago' }}
          </button>
        </div>

        @if (showPagoForm()) {
          <form [formGroup]="pagoForm" (ngSubmit)="registrarPago()" class="inline-form">
            <div class="if-row">
              <div class="if-field">
                <label>Monto (ARS) *</label>
                <input formControlName="monto" type="number" placeholder="50000" />
              </div>
              <div class="if-field">
                <label>Fecha</label>
                <input formControlName="fecha" type="date" />
              </div>
              <div class="if-field wide">
                <label>Descripción</label>
                <input formControlName="nota" placeholder="Anticipo 50%, saldo final..." />
              </div>
            </div>
            @if (pagoErr()) { <div class="err-sm">{{ pagoErr() }}</div> }
            <button type="submit" class="cta-sm" [disabled]="savingPago()">
              {{ savingPago() ? 'Guardando...' : 'Confirmar pago' }}
            </button>
          </form>
        }

        @if (pagoSvc.pagos().length === 0) {
          <div class="empty-state">Sin pagos registrados</div>
        } @else {
          <div class="list">
            @for (pago of pagoSvc.pagos(); track pago.id; let i = $index) {
              <div class="list-row">
                <span class="list-num">{{ i + 1 }}</span>
                <div class="list-info">
                  <span class="pago-amount">{{ fmt(pago.monto) }}</span>
                  @if (pago.nota) { <span class="list-sub">{{ pago.nota }}</span> }
                </div>
                <span class="list-date">{{ fd(pago.fecha) }}</span>
                <button class="del-btn" (click)="deletePago(pago.id)">✕</button>
              </div>
            }
          </div>
          <div class="list-total">
            <span>Total cobrado</span>
            <span class="green mono">{{ fmt(proyecto()!.monto_cobrado) }}</span>
          </div>
        }
      </div>
    }

    <!-- ══ TAB: ENTREGABLES ════════════════════════════════ -->
    @if (activeTab() === 'entregables') {
      <div class="panel">
        <div class="panel-hd">
          <h2 class="panel-title">Archivos y entregables</h2>
          <button class="btn-sm" (click)="showEntForm.set(!showEntForm())">
            {{ showEntForm() ? '✕ Cancelar' : '+ Agregar' }}
          </button>
        </div>

        @if (showEntForm()) {
          <form [formGroup]="entForm" (ngSubmit)="crearEntregable()" class="inline-form">
            <div class="if-row">
              <div class="if-field">
                <label>Tipo</label>
                <select formControlName="tipo">
                  <option value="figma">Figma</option>
                  <option value="drive">Google Drive</option>
                  <option value="notion">Notion</option>
                  <option value="github">GitHub</option>
                  <option value="link">Link externo</option>
                </select>
              </div>
              <div class="if-field wide">
                <label>Nombre *</label>
                <input formControlName="nombre" placeholder="Diseño final, Carpeta de contenido..." />
              </div>
              <div class="if-field wider">
                <label>URL *</label>
                <input formControlName="url" placeholder="https://..." />
              </div>
            </div>
            @if (entErr()) { <div class="err-sm">{{ entErr() }}</div> }
            <button type="submit" class="cta-sm" [disabled]="savingEnt()">
              {{ savingEnt() ? 'Guardando...' : 'Agregar entregable' }}
            </button>
          </form>
        }

        @if (entSvc.entregables().length === 0) {
          <div class="empty-state">Sin entregables todavía</div>
        } @else {
          <div class="ent-grid">
            @for (e of entSvc.entregables(); track e.id) {
              <div class="ent-card">
                <div class="ent-icon" [style.background]="getTipoColor(e.tipo) + '20'"
                     [style.color]="getTipoColor(e.tipo)">
                  {{ getTipoIcon(e.tipo) }}
                </div>
                <div class="ent-info">
                  <span class="ent-nombre">{{ e.nombre }}</span>
                  <a [href]="e.url" target="_blank" class="ent-url">{{ e.url }}</a>
                </div>
                <div class="ent-actions">
                  <a [href]="e.url" target="_blank" class="ent-open">Abrir ↗</a>
                  <button class="del-btn" (click)="deleteEnt(e.id)">✕</button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    }

    <!-- ══ TAB: HORAS ══════════════════════════════════════ -->
    @if (activeTab() === 'horas') {
      <div class="panel">
        <div class="panel-hd">
          <h2 class="panel-title">Horas trabajadas</h2>
          <button class="btn-sm" (click)="showHoraForm.set(!showHoraForm())">
            {{ showHoraForm() ? '✕ Cancelar' : '+ Registrar horas' }}
          </button>
        </div>

        @if (showHoraForm()) {
          <form [formGroup]="horaForm" (ngSubmit)="crearHora()" class="inline-form">
            <div class="if-row">
              <div class="if-field">
                <label>Categoría</label>
                <select formControlName="categoria">
                  @for (cat of catKeys; track cat) {
                    <option [value]="cat">{{ CATEGORIAS[cat].label }}</option>
                  }
                </select>
              </div>
              <div class="if-field">
                <label>Horas *</label>
                <input formControlName="cantidad" type="number" step="0.5" placeholder="2.5" />
              </div>
              <div class="if-field">
                <label>Fecha</label>
                <input formControlName="fecha" type="date" />
              </div>
              <div class="if-field wide">
                <label>Descripción</label>
                <input formControlName="descripcion" placeholder="Qué se hizo..." />
              </div>
            </div>
            @if (horaErr()) { <div class="err-sm">{{ horaErr() }}</div> }
            <button type="submit" class="cta-sm" [disabled]="savingHora()">
              {{ savingHora() ? 'Guardando...' : 'Registrar' }}
            </button>
          </form>
        }

        <!-- Resumen por categoría -->
        @if (horaSvc.totalHoras() > 0) {
          <div class="cat-summary">
            @for (cat of catKeys; track cat) {
              @if (horaSvc.porCategoria()[cat]) {
                <div class="cat-item">
                  <span class="cat-dot" [style.background]="CATEGORIAS[cat].color"></span>
                  <span class="cat-label">{{ CATEGORIAS[cat].label }}</span>
                  <div class="cat-bar-wrap">
                    <div class="cat-bar"
                      [style.width.%]="(horaSvc.porCategoria()[cat] / horaSvc.totalHoras()) * 100"
                      [style.background]="CATEGORIAS[cat].color + '60'">
                    </div>
                  </div>
                  <span class="cat-val">{{ horaSvc.porCategoria()[cat] }}h</span>
                </div>
              }
            }
            <div class="cat-total">
              <span>Total</span>
              <span class="mono">{{ horaSvc.totalHoras() }}h</span>
            </div>
          </div>
        }

        @if (horaSvc.horas().length === 0) {
          <div class="empty-state">Sin horas registradas todavía</div>
        } @else {
          <div class="list">
            @for (h of horaSvc.horas(); track h.id) {
              <div class="list-row">
                <span class="hora-dot" [style.background]="CATEGORIAS[h.categoria].color"></span>
                <div class="list-info">
                  <span class="hora-cat">{{ CATEGORIAS[h.categoria].label }}</span>
                  @if (h.descripcion) { <span class="list-sub">{{ h.descripcion }}</span> }
                </div>
                <span class="hora-qty mono">{{ h.cantidad }}h</span>
                <span class="list-date">{{ fd(h.fecha) }}</span>
                <button class="del-btn" (click)="deleteHora(h.id)">✕</button>
              </div>
            }
          </div>
        }
      </div>
    }

    <!-- ══ TAB: PRESUPUESTO ════════════════════════════════ -->
    @if (activeTab() === 'presupuesto') {
      <div class="panel">
        <div class="panel-hd">
          <h2 class="panel-title">Items del presupuesto</h2>
          <div class="hd-btns">
            <button class="btn-sm" (click)="addItem()">+ Agregar item</button>
            <button class="btn-sm primary" (click)="generarPDF()">↓ Descargar PDF</button>
          </div>
        </div>

        <div class="items-table">
          <div class="items-head">
            <span>Descripción</span>
            <span class="r">Cant.</span>
            <span class="r">Precio unit.</span>
            <span class="r">Subtotal</span>
            <span></span>
          </div>
          @for (item of items(); track $index; let i = $index) {
            <div class="item-row">
              <input class="item-input" [(ngModel)]="item.descripcion"
                     placeholder="Descripción del servicio" (change)="saveItems()" />
              <input class="item-input r" [(ngModel)]="item.cantidad"
                     type="number" min="1" (change)="saveItems()" />
              <input class="item-input r" [(ngModel)]="item.precio_unitario"
                     type="number" min="0" placeholder="0" (change)="saveItems()" />
              <span class="item-sub r mono">{{ fmt(item.cantidad * item.precio_unitario) }}</span>
              <button class="del-btn" (click)="removeItem(i)">✕</button>
            </div>
          }
          @if (items().length === 0) {
            <div class="empty-state">Agregá items para generar el presupuesto</div>
          }
        </div>

        @if (items().length > 0) {
          <div class="items-footer">
            <div class="total-row">
              <span>Subtotal</span>
              <span class="mono">{{ fmt(subtotal()) }}</span>
            </div>
            <div class="total-row main">
              <span>Total presupuestado</span>
              <span class="mono green">{{ fmt(proyecto()!.presupuesto) }}</span>
            </div>
          </div>
        }
      </div>
    }

    <!-- ══ TAB: ESTADO ═════════════════════════════════════ -->
    @if (activeTab() === 'estado') {
      <div class="two-col">
        <div class="panel">
          <h2 class="panel-title">Cambiar estado del proyecto</h2>
          @if (TRANS[proyecto()!.estado].length === 0) {
            <p class="no-actions">No hay transiciones disponibles para este estado.</p>
          } @else {
            <div class="trans-list">
              @for (e of TRANS[proyecto()!.estado]; track e) {
                <button class="trans-btn" [disabled]="transitioning()"
                        (click)="cambiarEstado(e)">
                  <span class="trans-dot" [style.background]="META[e].color"></span>
                  Mover a {{ META[e].label }}
                  <span class="trans-arrow">→</span>
                </button>
              }
            </div>
          }
        </div>

        <div class="panel">
          <h2 class="panel-title">Editar proyecto</h2>
          <form [formGroup]="editForm" (ngSubmit)="guardarEdicion()">
            <div class="if-field" style="margin-bottom:10px">
              <label>Nombre</label>
              <input formControlName="nombre" />
            </div>
            <div class="if-field" style="margin-bottom:10px">
              <label>Presupuesto total (ARS)</label>
              <input formControlName="presupuesto" type="number" />
            </div>
            <div class="if-field" style="margin-bottom:10px">
              <label>Fecha de entrega</label>
              <input formControlName="fecha_entrega" type="date" />
            </div>
            <div class="if-field" style="margin-bottom:14px">
              <label>Descripción</label>
              <textarea formControlName="descripcion" rows="3"></textarea>
            </div>
            @if (editErr()) { <div class="err-sm">{{ editErr() }}</div> }
            <button type="submit" class="cta-sm" [disabled]="savingEdit()">
              {{ savingEdit() ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </form>
        </div>
      </div>
    }

  }
</div>
  `,
  styles: [`
    .page { max-width: 960px; }

    /* Breadcrumb */
    .bc { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--ink-3); margin-bottom:20px; }
    .bc a { color:var(--ink-3); } .bc a:hover { color:var(--accent-2); }
    .bc .sep,.bc span:not(.sep) { }

    /* Loader */
    .center-load { display:flex; justify-content:center; padding:60px; }
    .spin { width:28px;height:28px;border:2px solid var(--line-2);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }

    /* Header */
    .proj-hd { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px; }
    .proj-title { font-size:1.6rem;font-weight:600;color:var(--ink);letter-spacing:-.03em;margin-bottom:6px; }
    .proj-meta { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
    .proj-client { font-size:13.5px;color:var(--ink-2);font-weight:500; }
    .sep { color:var(--ink-3);font-size:10px; }
    .badge { padding:3px 8px;border-radius:5px;font-size:11px;font-weight:500; }
    .date-chip { font-size:12px;color:var(--ink-3);font-family:var(--mono); }
    .hd-actions { display:flex;gap:8px;flex-shrink:0; }
    .btn-outline { display:flex;align-items:center;gap:6px;padding:7px 14px;background:none;border:1px solid var(--line-2);border-radius:var(--radius);color:var(--ink-2);font-size:12.5px;cursor:pointer;transition:all .15s;white-space:nowrap; }
    .btn-outline:hover { border-color:var(--accent);color:var(--accent-2); }

    /* Métricas */
    .metrics { display:flex;align-items:center;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-lg);padding:16px 20px;margin-bottom:18px;gap:0;overflow-x:auto; }
    .metric { flex-shrink:0; }
    .m-div { width:1px;height:36px;background:var(--line);margin:0 18px;flex-shrink:0; }
    .m-label { display:block;font-size:10.5px;font-weight:500;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px; }
    .m-val { font-size:1.1rem;font-weight:600;color:var(--ink);font-family:var(--mono);letter-spacing:-.02em; }
    .m-val.green { color:var(--green); }
    .m-val.amber { color:var(--amber); }
    .pct-metric { min-width:120px; }
    .pct-row-m { display:flex;align-items:center;gap:8px; }
    .mini-track { width:60px;height:5px;background:var(--bg-3);border-radius:999px;overflow:hidden; }
    .mini-fill { height:100%;background:var(--accent);border-radius:999px;transition:width .4s; }

    /* Tabs */
    .tabs { display:flex;gap:2px;border-bottom:1px solid var(--line);margin-bottom:18px; }
    .tab { padding:9px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--ink-3);font-size:13.5px;cursor:pointer;transition:all .15s;margin-bottom:-1px; }
    .tab:hover { color:var(--ink-2); }
    .tab.active { color:var(--accent-2);border-bottom-color:var(--accent); }

    /* Panel */
    .panel { background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius-lg);padding:18px;margin-bottom:12px; }
    .panel-hd { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px; }
    .panel-title { font-size:13.5px;font-weight:600;color:var(--ink);letter-spacing:-.01em;margin:0 0 14px; }
    .panel-hd .panel-title { margin:0; }
    .hd-btns { display:flex;gap:6px; }
    .btn-sm { display:flex;align-items:center;gap:5px;padding:6px 12px;background:none;border:1px solid var(--line-2);border-radius:var(--radius);color:var(--ink-2);font-size:12px;cursor:pointer;transition:all .15s; }
    .btn-sm:hover { border-color:var(--accent);color:var(--accent-2); }
    .btn-sm.primary { background:var(--accent);border-color:var(--accent);color:white; }
    .btn-sm.primary:hover { opacity:.88; }

    /* Inline form */
    .inline-form { background:var(--bg-3);border-radius:var(--radius);padding:14px;margin-bottom:14px;display:flex;flex-direction:column;gap:10px; }
    .if-row { display:flex;gap:10px;flex-wrap:wrap; }
    .if-field { display:flex;flex-direction:column;gap:5px;min-width:120px; }
    .if-field.wide { flex:1;min-width:160px; }
    .if-field.wider { flex:2;min-width:200px; }
    .if-field label { font-size:11.5px;font-weight:500;color:var(--ink-2); }
    .if-field input,.if-field select,.if-field textarea { padding:8px 11px;background:var(--bg-1);border:1px solid var(--line);border-radius:8px;color:var(--ink);font-size:13.5px;font-family:var(--font); }
    .if-field input:focus,.if-field select:focus,.if-field textarea:focus { outline:none;border-color:var(--accent); }
    .err-sm { font-size:12px;color:var(--red);background:var(--red-bg);padding:7px 10px;border-radius:7px; }
    .cta-sm { padding:8px 14px;background:var(--accent);border:none;border-radius:8px;color:white;font-size:13px;font-weight:500;cursor:pointer;align-self:flex-start; }
    .cta-sm:disabled { opacity:.5;cursor:not-allowed; }

    /* Lista genérica */
    .list { display:flex;flex-direction:column;gap:1px; }
    .list-row { display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:8px;transition:background .15s; }
    .list-row:hover { background:var(--bg-3); }
    .list-row:hover .del-btn { opacity:1; }
    .list-num { width:20px;height:20px;border-radius:5px;background:var(--bg-3);color:var(--ink-3);font-size:11px;font-family:var(--mono);display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .list-info { flex:1;display:flex;flex-direction:column;gap:1px; }
    .list-sub { font-size:11.5px;color:var(--ink-3); }
    .list-date { font-size:11.5px;color:var(--ink-3);font-family:var(--mono);white-space:nowrap; }
    .del-btn { background:none;border:none;cursor:pointer;color:var(--ink-3);padding:4px 5px;border-radius:5px;opacity:0;transition:all .15s;font-size:11px; }
    .del-btn:hover { color:var(--red);background:var(--red-bg); }
    .pago-amount { font-size:14px;font-weight:600;color:var(--green);font-family:var(--mono); }
    .list-total { display:flex;justify-content:space-between;align-items:center;padding:12px 8px 0;border-top:1px solid var(--line);margin-top:8px;font-size:13px;color:var(--ink-2); }

    /* Entregables */
    .ent-grid { display:flex;flex-direction:column;gap:6px; }
    .ent-card { display:flex;align-items:center;gap:12px;padding:11px 12px;background:var(--bg-3);border-radius:9px;transition:background .15s; }
    .ent-card:hover { background:var(--bg-1); }
    .ent-card:hover .del-btn { opacity:1; }
    .ent-icon { width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:var(--mono);flex-shrink:0; }
    .ent-info { flex:1;min-width:0;display:flex;flex-direction:column;gap:2px; }
    .ent-nombre { font-size:13.5px;font-weight:500;color:var(--ink); }
    .ent-url { font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .ent-actions { display:flex;align-items:center;gap:8px; }
    .ent-open { font-size:12px;color:var(--accent-2);text-decoration:none; }

    /* Horas */
    .cat-summary { background:var(--bg-3);border-radius:var(--radius);padding:14px;margin-bottom:14px;display:flex;flex-direction:column;gap:8px; }
    .cat-item { display:flex;align-items:center;gap:10px; }
    .cat-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .cat-label { font-size:12.5px;color:var(--ink-2);width:90px;flex-shrink:0; }
    .cat-bar-wrap { flex:1;height:6px;background:var(--bg-2);border-radius:999px;overflow:hidden; }
    .cat-bar { height:100%;border-radius:999px;transition:width .4s; }
    .cat-val { font-size:12.5px;color:var(--ink);font-family:var(--mono);width:40px;text-align:right;flex-shrink:0; }
    .cat-total { display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-2);font-weight:600; }
    .hora-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .hora-cat { font-size:13.5px;font-weight:500;color:var(--ink); }
    .hora-qty { font-size:14px;font-weight:600;color:var(--accent-2);min-width:40px;text-align:right; }

    /* Items presupuesto */
    .items-table { display:flex;flex-direction:column;gap:1px;margin-bottom:0; }
    .items-head { display:grid;grid-template-columns:1fr 60px 120px 120px 28px;gap:8px;padding:6px 8px;font-size:11px;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em; }
    .item-row { display:grid;grid-template-columns:1fr 60px 120px 120px 28px;gap:8px;align-items:center;padding:4px 4px; }
    .item-row:hover .del-btn { opacity:1; }
    .item-input { padding:7px 10px;background:var(--bg-3);border:1px solid transparent;border-radius:7px;color:var(--ink);font-size:13px;font-family:var(--font);transition:border-color .15s; }
    .item-input:focus { outline:none;border-color:var(--accent);background:var(--bg-1); }
    .item-input.r { text-align:right; }
    .item-sub { font-size:13px;font-family:var(--mono);color:var(--ink-2);text-align:right;padding-right:4px; }
    .items-footer { border-top:1px solid var(--line);padding-top:14px;margin-top:8px;display:flex;flex-direction:column;gap:6px;align-items:flex-end; }
    .total-row { display:flex;gap:40px;font-size:13px;color:var(--ink-2); }
    .total-row.main { font-size:15px;font-weight:600;color:var(--ink); }
    .r { text-align:right; }

    /* Estado / edición */
    .two-col { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
    .trans-list { display:flex;flex-direction:column;gap:6px; }
    .trans-btn { display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:var(--radius);background:var(--bg-3);border:1px solid var(--line);color:var(--ink-2);font-size:13px;cursor:pointer;transition:all .15s;width:100%; }
    .trans-btn:hover { border-color:var(--line-2);color:var(--ink);background:var(--bg-1); }
    .trans-btn:disabled { opacity:.4;cursor:not-allowed; }
    .trans-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .trans-arrow { margin-left:auto;color:var(--ink-3); }
    .no-actions { font-size:13px;color:var(--ink-3); }

    /* Misc */
    .empty-state { text-align:center;padding:24px;color:var(--ink-3);font-size:13.5px; }
    .green { color:var(--green) !important; }
    .amber { color:var(--amber) !important; }
    .mono { font-family:var(--mono); }
  `]
})
export class ProyectoDetailComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private fb     = inject(FormBuilder);
  svc     = inject(ProyectoService);
  pagoSvc = inject(PagoService);
  entSvc  = inject(EntregableService);
  horaSvc = inject(HoraService);

  META       = META;
  TRANS      = TRANS;
  CATEGORIAS = CATEGORIAS;
  catKeys    = Object.keys(CATEGORIAS) as CategoriaHora[];

  proyecto      = signal<Proyecto | null>(null);
  activeTab     = signal('pagos');
  copied        = signal(false);
  items         = signal<ItemPresupuesto[]>([]);

  showPagoForm  = signal(false);
  showEntForm   = signal(false);
  showHoraForm  = signal(false);

  savingPago    = signal(false);
  savingEnt     = signal(false);
  savingHora    = signal(false);
  savingEdit    = signal(false);
  transitioning = signal(false);

  pagoErr  = signal('');
  entErr   = signal('');
  horaErr  = signal('');
  editErr  = signal('');

  tabs = [
    { id: 'pagos',        label: 'Pagos'         },
    { id: 'entregables',  label: 'Entregables'   },
    { id: 'horas',        label: 'Horas'         },
    { id: 'presupuesto',  label: 'Presupuesto'   },
    { id: 'estado',       label: 'Estado / Editar'},
  ];

  pagoForm = this.fb.group({
    monto: [null as number|null, [Validators.required, Validators.min(1)]],
    fecha: [new Date().toISOString().split('T')[0]],
    nota:  [''],
  });

  entForm = this.fb.group({
    tipo:   ['drive'],
    nombre: ['', Validators.required],
    url:    ['', Validators.required],
  });

  horaForm = this.fb.group({
    categoria:   ['diseno'],
    cantidad:    [null as number|null, [Validators.required, Validators.min(0.5)]],
    fecha:       [new Date().toISOString().split('T')[0]],
    descripcion: [''],
  });

  editForm = this.fb.group({
    nombre:        ['', Validators.required],
    presupuesto:   [0],
    fecha_entrega: [''],
    descripcion:   [''],
  });

  get id() { return this.route.snapshot.paramMap.get('id')!; }

  pct        = computed(() => {
    const p = this.proyecto();
    if (!p || !p.presupuesto) return 0;
    return Math.min(100, Math.round((p.monto_cobrado / p.presupuesto) * 100));
  });
  pendiente  = computed(() => {
    const p = this.proyecto();
    return p ? Math.max(0, p.presupuesto - p.monto_cobrado) : 0;
  });
  rentabilidad = computed(() => {
    const p = this.proyecto();
    const h = this.horaSvc.totalHoras();
    if (!p || h === 0) return 0;
    return Math.round(p.monto_cobrado / h);
  });
  subtotal = computed(() =>
    this.items().reduce((acc, i) => acc + (i.cantidad * i.precio_unitario), 0)
  );

  async ngOnInit() {
    await this.svc.loadAll();
    const p = this.svc.proyectos().find(p => p.id === this.id) ?? null;
    this.proyecto.set(p);
    if (p) {
      this.editForm.patchValue({
        nombre: p.nombre, presupuesto: p.presupuesto,
        fecha_entrega: p.fecha_entrega ?? '', descripcion: p.descripcion ?? '',
      });
      this.items.set(p.items_presupuesto ?? []);
    }
    await Promise.all([
      this.pagoSvc.loadByProyecto(this.id),
      this.entSvc.loadByProyecto(this.id),
      this.horaSvc.loadByProyecto(this.id),
    ]);
  }

  async registrarPago() {
    if (this.pagoForm.invalid) return;
    this.savingPago.set(true); this.pagoErr.set('');
    try {
      await this.pagoSvc.registrar({ ...this.pagoForm.value as any, proyecto_id: this.id });
      await this.reloadProyecto();
      this.pagoForm.patchValue({ monto: null, nota: '' });
      this.showPagoForm.set(false);
    } catch (e: any) { this.pagoErr.set(e.message); }
    finally { this.savingPago.set(false); }
  }

  async deletePago(id: string) {
    if (!confirm('¿Eliminar pago?')) return;
    await this.pagoSvc.delete(id);
    await this.reloadProyecto();
  }

  async crearEntregable() {
    if (this.entForm.invalid) return;
    this.savingEnt.set(true); this.entErr.set('');
    try {
      await this.entSvc.create({ ...this.entForm.value as any, proyecto_id: this.id });
      this.entForm.patchValue({ nombre: '', url: '' });
      this.showEntForm.set(false);
    } catch (e: any) { this.entErr.set(e.message); }
    finally { this.savingEnt.set(false); }
  }

  async deleteEnt(id: string) {
    if (!confirm('¿Eliminar entregable?')) return;
    await this.entSvc.delete(id);
  }

  async crearHora() {
    if (this.horaForm.invalid) return;
    this.savingHora.set(true); this.horaErr.set('');
    try {
      await this.horaSvc.create({ ...this.horaForm.value as any, proyecto_id: this.id });
      this.horaForm.patchValue({ cantidad: null, descripcion: '' });
      this.showHoraForm.set(false);
    } catch (e: any) { this.horaErr.set(e.message); }
    finally { this.savingHora.set(false); }
  }

  async deleteHora(id: string) {
    if (!confirm('¿Eliminar registro de horas?')) return;
    await this.horaSvc.delete(id);
  }

  async cambiarEstado(estado: EstadoProyecto) {
    this.transitioning.set(true);
    await this.svc.updateEstado(this.id, estado);
    await this.reloadProyecto();
    this.transitioning.set(false);
  }

  async guardarEdicion() {
    if (this.editForm.invalid) return;
    this.savingEdit.set(true); this.editErr.set('');
    try {
      await this.svc.update(this.id, this.editForm.value as any);
      await this.reloadProyecto();
    } catch (e: any) { this.editErr.set(e.message); }
    finally { this.savingEdit.set(false); }
  }

  addItem() {
    this.items.update(l => [...l, { descripcion: '', cantidad: 1, precio_unitario: 0 }]);
  }
  removeItem(i: number) {
    this.items.update(l => l.filter((_, idx) => idx !== i));
    this.saveItems();
  }
  async saveItems() {
    await this.svc.update(this.id, { items_presupuesto: this.items() as any });
  }

  async copyPortal() {
    const p = this.proyecto();
    if (!p?.token_publico) return;
    const url = `${window.location.origin}/p/${p.token_publico}`;
    await navigator.clipboard.writeText(url);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  generarPDF() {
    const p = this.proyecto();
    if (!p) return;
    const items = this.items();
    const html = this.buildPDFHtml(p, items);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }

  private buildPDFHtml(p: Proyecto, items: ItemPresupuesto[]): string {
    const total = items.reduce((a,i) => a + i.cantidad * i.precio_unitario, 0);
    const rows = items.map(i => `
      <tr>
        <td>${i.descripcion}</td>
        <td style="text-align:center">${i.cantidad}</td>
        <td style="text-align:right">${this.fmt(i.precio_unitario)}</td>
        <td style="text-align:right;font-weight:600">${this.fmt(i.cantidad * i.precio_unitario)}</td>
      </tr>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Presupuesto — ${p.nombre}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Helvetica Neue',Arial,sans-serif; color:#111; padding:40px; font-size:13px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; border-bottom:2px solid #7c6af7; padding-bottom:20px; }
        .agency { font-size:22px; font-weight:700; color:#7c6af7; }
        .doc-title { font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:#999; margin-top:4px; }
        .client-block h3 { font-size:11px; text-transform:uppercase; color:#999; letter-spacing:.08em; margin-bottom:6px; }
        .client-block p { font-size:14px; font-weight:600; color:#111; }
        .client-block span { font-size:12px; color:#666; }
        .project-info { background:#f8f8ff; border-radius:8px; padding:16px 20px; margin-bottom:24px; display:flex; gap:40px; }
        .info-item label { font-size:10px; text-transform:uppercase; color:#999; letter-spacing:.08em; display:block; margin-bottom:4px; }
        .info-item span { font-size:14px; font-weight:500; color:#111; }
        table { width:100%; border-collapse:collapse; margin-bottom:24px; }
        thead th { background:#7c6af7; color:white; padding:10px 14px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
        tbody tr:nth-child(even) { background:#f9f9ff; }
        tbody td { padding:10px 14px; border-bottom:1px solid #eee; }
        .totals { display:flex; justify-content:flex-end; }
        .totals-box { width:260px; }
        .total-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee; font-size:13px; color:#555; }
        .total-final { display:flex; justify-content:space-between; padding:12px 0; font-size:16px; font-weight:700; color:#111; border-top:2px solid #7c6af7; margin-top:4px; }
        .footer { margin-top:60px; padding-top:20px; border-top:1px solid #eee; font-size:11px; color:#999; text-align:center; }
        @media print { body { padding:20px; } }
      </style>
    </head><body>
      <div class="header">
        <div>
          <div class="agency">APA Marketing</div>
          <div class="doc-title">Presupuesto de servicios</div>
        </div>
        <div class="client-block" style="text-align:right">
          <h3>Cliente</h3>
          <p>${p.clientes?.empresa ?? ''}</p>
          <span>${p.clientes?.nombre ?? ''}</span><br>
          ${p.clientes?.email ? `<span>${p.clientes.email}</span>` : ''}
        </div>
      </div>
      <div class="project-info">
        <div class="info-item"><label>Proyecto</label><span>${p.nombre}</span></div>
        <div class="info-item"><label>Fecha</label><span>${new Date().toLocaleDateString('es-AR')}</span></div>
        ${p.fecha_entrega ? `<div class="info-item"><label>Entrega estimada</label><span>${this.fd(p.fecha_entrega)}</span></div>` : ''}
        ${p.descripcion ? `<div class="info-item"><label>Descripción</label><span>${p.descripcion}</span></div>` : ''}
      </div>
      <table>
        <thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio unitario</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:#999;padding:20px">Sin items cargados</td></tr>'}</tbody>
      </table>
      <div class="totals"><div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span>${this.fmt(total)}</span></div>
        <div class="total-final"><span>Total</span><span style="color:#7c6af7">${this.fmt(total || p.presupuesto)}</span></div>
      </div></div>
      <div class="footer">APA Marketing • Presupuesto generado el ${new Date().toLocaleDateString('es-AR')} • Válido por 30 días</div>
    </body></html>`;
  }

  private async reloadProyecto() {
    await this.svc.loadAll();
    this.proyecto.set(this.svc.proyectos().find(p => p.id === this.id) ?? null);
  }

  getTipoIcon(tipo: TipoEntregable) { return TIPO_ICONS[tipo]; }
  getTipoColor(tipo: TipoEntregable) { return TIPO_COLORS[tipo]; }

  fmt(n: number) {
    return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(n);
  }
  fd(iso: string) {
    return new Date(iso + 'T00:00').toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' });
  }
}
