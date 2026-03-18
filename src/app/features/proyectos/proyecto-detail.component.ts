import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProyectoService } from '../../core/services/proyecto.service';
import { PagoService } from '../../core/services/pago.service';
import { EntregableService } from '../../core/services/entregable.service';
import { HoraService, CATEGORIAS } from '../../core/services/hora.service';
import { ActividadService } from '../../core/services/actividad.service';
import { ToastService } from '../../core/services/toast.service';
import { Proyecto, EstadoProyecto, TipoEntregable } from '../../core/models';

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

const ACTIVIDAD_ICON: Record<string, string> = {
  proyecto_creado:      '🚀',
  estado_cambio:        '🔄',
  pago_registrado:      '💰',
  pago_eliminado:       '🗑',
  entregable_agregado:  '📎',
  entregable_eliminado: '🗑',
  hora_registrada:      '⏱',
  nota:                 '📝',
};

const TIPO_ICON: Record<TipoEntregable, string> = {
  figma:  'F',
  drive:  'D',
  notion: 'N',
  github: 'G',
  link:   '↗',
};

const TIPO_COLOR: Record<TipoEntregable, string> = {
  figma:  '#a259ff',
  drive:  '#34a853',
  notion: '#ffffff',
  github: '#e6edf3',
  link:   'var(--accent-2)',
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
        <div class="loading"><div class="spin"></div></div>
      } @else {
        <!-- Header -->
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
                <span class="proj-date">Entrega: {{ fd(proyecto()!.fecha_entrega!) }}</span>
              }
            </div>
          </div>
        </div>

        <!-- Métricas -->
        <div class="metrics-row">
          <div class="metric">
            <span class="metric-label">Presupuesto</span>
            <span class="metric-val">{{ fmt(proyecto()!.presupuesto) }}</span>
          </div>
          <div class="metric-div"></div>
          <div class="metric">
            <span class="metric-label">Cobrado</span>
            <span class="metric-val green">{{ fmt(proyecto()!.monto_cobrado) }}</span>
          </div>
          <div class="metric-div"></div>
          <div class="metric">
            <span class="metric-label">Pendiente</span>
            <span class="metric-val" [class.amber]="pendiente() > 0">
              {{ fmt(pendiente()) }}
            </span>
          </div>
          <div class="metric-div"></div>
          <div class="metric">
            <span class="metric-label">Rentabilidad</span>
            <span class="metric-val" [class.green]="rentabilidad() > 0">
              {{ rentabilidad() > 0 ? fmt(rentabilidad()) + '/h' : '—' }}
            </span>
          </div>
          <div class="metric-div"></div>
          <div class="metric">
            <span class="metric-label">Avance cobro</span>
            <div class="metric-pct-wrap">
              <div class="metric-track">
                <div class="metric-fill"
                  [style.width.%]="pct()"
                  [style.background]="pct() >= 100 ? 'var(--green)' : 'var(--accent)'">
                </div>
              </div>
              <span class="metric-val">{{ pct() }}%</span>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          @for (tab of tabs; track tab.id) {
            <button class="tab" [class.active]="tabActivo() === tab.id"
                    (click)="tabActivo.set(tab.id)">
              {{ tab.label }}
              @if (tab.count() > 0) {
                <span class="tab-count">{{ tab.count() }}</span>
              }
            </button>
          }
        </div>

        <div class="tab-content">

          <!-- TAB: PAGOS -->
          @if (tabActivo() === 'pagos') {
            <div class="panel">
              <div class="panel-head">
                <h2 class="panel-title">Historial de pagos</h2>
                <button class="btn-outline" (click)="showPagoForm.set(!showPagoForm())">
                  @if (showPagoForm()) { ✕ Cancelar } @else {
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Registrar pago
                  }
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
                    <div class="if-field if-field-wide">
                      <label>Descripción</label>
                      <input formControlName="nota" placeholder="Anticipo 50%, saldo final..." />
                    </div>
                    <button type="submit" class="cta-sm" [disabled]="savingPago()">
                      @if (savingPago()) { ... } @else { Confirmar }
                    </button>
                  </div>
                </form>
              }

              @if (pagoSvc.pagos().length === 0) {
                <div class="empty-tab">Sin pagos registrados</div>
              } @else {
                <div class="pagos-list">
                  @for (pago of pagoSvc.pagos(); track pago.id; let i = $index) {
                    <div class="pago-row">
                      <div class="pago-num">{{ i + 1 }}</div>
                      <div class="pago-info">
                        <span class="pago-monto">{{ fmt(pago.monto) }}</span>
                        @if (pago.nota) { <span class="pago-nota">{{ pago.nota }}</span> }
                      </div>
                      <span class="pago-fecha">{{ fd(pago.fecha) }}</span>
                      <button class="del-btn" (click)="eliminarPago(pago.id)">
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
          }

          <!-- TAB: ENTREGABLES -->
          @if (tabActivo() === 'entregables') {
            <div class="panel">
              <div class="panel-head">
                <h2 class="panel-title">Archivos y entregables</h2>
                <button class="btn-outline" (click)="showEntForm.set(!showEntForm())">
                  @if (showEntForm()) { ✕ Cancelar } @else {
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Agregar link
                  }
                </button>
              </div>

              @if (showEntForm()) {
                <form [formGroup]="entForm" (ngSubmit)="agregarEntregable()" class="inline-form">
                  <div class="if-row">
                    <div class="if-field">
                      <label>Nombre *</label>
                      <input formControlName="nombre" placeholder="Diseño final" />
                    </div>
                    <div class="if-field if-field-wide">
                      <label>URL *</label>
                      <input formControlName="url" placeholder="https://..." />
                    </div>
                    <div class="if-field">
                      <label>Tipo</label>
                      <select formControlName="tipo">
                        <option value="figma">Figma</option>
                        <option value="drive">Drive</option>
                        <option value="notion">Notion</option>
                        <option value="github">GitHub</option>
                        <option value="link">Link</option>
                      </select>
                    </div>
                    <button type="submit" class="cta-sm" [disabled]="savingEnt()">
                      @if (savingEnt()) { ... } @else { Agregar }
                    </button>
                  </div>
                </form>
              }

              @if (entSvc.entregables().length === 0) {
                <div class="empty-tab">Sin entregables todavía</div>
              } @else {
                <div class="ent-list">
                  @for (e of entSvc.entregables(); track e.id) {
                    <div class="ent-row">
                      <div class="ent-tipo-badge" [style.background]="TIPO_COLOR[e.tipo] + '20'"
                           [style.color]="TIPO_COLOR[e.tipo]">
                        {{ TIPO_ICON[e.tipo] }}
                      </div>
                      <div class="ent-info">
                        <span class="ent-nombre">{{ e.nombre }}</span>
                        <span class="ent-url">{{ e.url }}</span>
                      </div>
                      <a [href]="e.url" target="_blank" class="ent-open">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Abrir
                      </a>
                      <button class="del-btn" (click)="eliminarEntregable(e.id)">
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
          }

          <!-- TAB: HORAS -->
          @if (tabActivo() === 'horas') {
            <div class="panel">
              <div class="panel-head">
                <h2 class="panel-title">Horas trabajadas</h2>
                <div class="panel-head-right">
                  <span class="total-horas">Total: {{ horaSvc.totalHoras() }}h</span>
                  <button class="btn-outline" (click)="showHoraForm.set(!showHoraForm())">
                    @if (showHoraForm()) { ✕ Cancelar } @else { + Registrar }
                  </button>
                </div>
              </div>

              @if (showHoraForm()) {
                <form [formGroup]="horaForm" (ngSubmit)="registrarHora()" class="inline-form">
                  <div class="if-row">
                    <div class="if-field">
                      <label>Categoría</label>
                      <select formControlName="categoria">
                        @for (cat of categoriasKeys; track cat) {
                          <option [value]="cat">{{ CATEGORIAS[cat].label }}</option>
                        }
                      </select>
                    </div>
                    <div class="if-field">
                      <label>Horas *</label>
                      <input formControlName="cantidad" type="number" step="0.5" placeholder="2" />
                    </div>
                    <div class="if-field if-field-wide">
                      <label>Descripción</label>
                      <input formControlName="descripcion" placeholder="Reunión de kickoff..." />
                    </div>
                    <button type="submit" class="cta-sm" [disabled]="savingHora()">
                      @if (savingHora()) { ... } @else { Agregar }
                    </button>
                  </div>
                </form>
              }

              <!-- Gráfico de dona de horas por categoría -->
              @if (horaSvc.totalHoras() > 0) {
                <div class="hora-summary">
                  @for (cat of categoriasKeys; track cat) {
                    @if (horaSvc.porCategoria()[cat]) {
                      <div class="hora-cat">
                        <div class="hora-cat-dot" [style.background]="CATEGORIAS[cat].color"></div>
                        <span class="hora-cat-label">{{ CATEGORIAS[cat].label }}</span>
                        <div class="hora-cat-bar">
                          <div class="hora-cat-fill"
                            [style.width.%]="(horaSvc.porCategoria()[cat] / horaSvc.totalHoras()) * 100"
                            [style.background]="CATEGORIAS[cat].color">
                          </div>
                        </div>
                        <span class="hora-cat-val">{{ horaSvc.porCategoria()[cat] }}h</span>
                      </div>
                    }
                  }
                </div>
              }

              @if (horaSvc.horas().length === 0) {
                <div class="empty-tab">Sin horas registradas</div>
              } @else {
                <div class="horas-list">
                  @for (h of horaSvc.horas(); track h.id) {
                    <div class="hora-row">
                      <div class="hora-cat-badge"
                        [style.background]="CATEGORIAS[h.categoria].color + '20'"
                        [style.color]="CATEGORIAS[h.categoria].color">
                        {{ CATEGORIAS[h.categoria].label }}
                      </div>
                      <div class="hora-info">
                        @if (h.descripcion) { <span class="hora-desc">{{ h.descripcion }}</span> }
                      </div>
                      <span class="hora-fecha">{{ fd(h.fecha) }}</span>
                      <span class="hora-cant">{{ h.cantidad }}h</span>
                      <button class="del-btn" (click)="eliminarHora(h.id)">
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
          }

          <!-- TAB: ACTIVIDAD -->
          @if (tabActivo() === 'actividad') {
            <div class="panel">
              <h2 class="panel-title">Historial de actividad</h2>

              @if (actSvc.loading()) {
                <div class="empty-tab">Cargando...</div>
              } @else if (actSvc.actividades().length === 0) {
                <div class="empty-tab">Sin actividad registrada</div>
              } @else {
                <div class="timeline">
                  @for (a of actSvc.actividades(); track a.id; let last = $last) {
                    <div class="tl-item">
                      <div class="tl-left">
                        <div class="tl-icon">{{ ACTIVIDAD_ICON[a.tipo] ?? '•' }}</div>
                        @if (!last) { <div class="tl-line"></div> }
                      </div>
                      <div class="tl-body">
                        <p class="tl-desc">{{ a.descripcion }}</p>
                        <div class="tl-meta">
                          @if (a.usuario_email) {
                            <span class="tl-user">{{ a.usuario_email }}</span>
                            <span class="tl-sep">·</span>
                          }
                          <span class="tl-time">{{ fdRelativo(a.created_at) }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- TAB: PRESUPUESTO -->
          @if (tabActivo() === 'presupuesto') {
            <div class="panel">
              <div class="panel-head">
                <h2 class="panel-title">Items del presupuesto</h2>
                <div class="panel-head-right">
                  <button class="btn-pdf" (click)="generarPDF()" [disabled]="generandoPDF()">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    @if (generandoPDF()) { Generando... } @else { Descargar PDF }
                  </button>
                </div>
              </div>

              <!-- Formulario para agregar item -->
              <form [formGroup]="itemForm" (ngSubmit)="agregarItem()" class="inline-form" style="margin-bottom:16px">
                <div class="if-row">
                  <div class="if-field if-field-wide">
                    <label>Descripción *</label>
                    <input formControlName="descripcion" placeholder="Diseño de logo, desarrollo web..." />
                  </div>
                  <div class="if-field">
                    <label>Cant.</label>
                    <input formControlName="cantidad" type="number" min="1" style="width:70px" />
                  </div>
                  <div class="if-field">
                    <label>Precio unit. (ARS)</label>
                    <input formControlName="precio_unitario" type="number" min="0" style="width:130px" />
                  </div>
                  <button type="submit" class="cta-sm">+ Agregar</button>
                </div>
              </form>

              <!-- Tabla de items -->
              @if (!proyecto()!.items_presupuesto || proyecto()!.items_presupuesto!.length === 0) {
                <div class="empty-tab">Sin items todavía — agregá el detalle del presupuesto</div>
              } @else {
                <table class="budget-table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th class="r">Cant.</th>
                      <th class="r">Precio unit.</th>
                      <th class="r">Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of proyecto()!.items_presupuesto!; track $index; let i = $index) {
                      <tr>
                        <td>{{ item.descripcion }}</td>
                        <td class="r mono">{{ item.cantidad }}</td>
                        <td class="r mono">{{ fmt(item.precio_unitario) }}</td>
                        <td class="r mono green">{{ fmt(item.cantidad * item.precio_unitario) }}</td>
                        <td>
                          <button class="del-btn" style="opacity:1" (click)="quitarItem(i)">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" class="total-label">Total presupuestado</td>
                      <td class="r mono total-val">{{ fmt(totalItems()) }}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              }
            </div>
          }


        </div>

        <!-- Sidebar de acciones -->
        <div class="side-panel">

          <!-- Cambiar estado -->
          @if (TRANS[proyecto()!.estado].length > 0) {
            <div class="side-card">
              <h3 class="side-title">Cambiar estado</h3>
              <div class="trans-list">
                @for (e of TRANS[proyecto()!.estado]; track e) {
                  <button class="trans-btn" [disabled]="transitioning()"
                          (click)="cambiarEstado(e)">
                    <span class="trans-dot" [style.background]="META[e].color"></span>
                    {{ META[e].label }}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:auto">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                }
              </div>
            </div>
          }

          <!-- Portal del cliente -->
          @if (proyecto()!.token_publico) {
            <div class="side-card portal-card">
              <h3 class="side-title">Portal del cliente</h3>
              <p class="portal-hint">Compartí este link con tu cliente para que vea el avance.</p>
              <div class="portal-url" (click)="copiarPortal()">
                <span class="portal-url-text">/p/{{ proyecto()!.token_publico!.slice(0,12) }}...</span>
                <span class="portal-copy-icon">
                  @if (copiado()) {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  } @else {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  }
                </span>
              </div>
              <a [href]="portalUrl()" target="_blank" class="portal-btn">
                Abrir portal
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            </div>
          }

          <!-- Info -->
          <div class="side-card">
            <h3 class="side-title">Información</h3>
            <div class="info-rows">
              <div class="info-row">
                <span class="info-k">Cliente</span>
                <span class="info-v">{{ proyecto()!.clientes?.empresa }}</span>
              </div>
              <div class="info-row">
                <span class="info-k">Inicio</span>
                <span class="info-v mono">{{ fd(proyecto()!.fecha_inicio) }}</span>
              </div>
              @if (proyecto()!.fecha_entrega) {
                <div class="info-row">
                  <span class="info-k">Entrega</span>
                  <span class="info-v mono">{{ fd(proyecto()!.fecha_entrega!) }}</span>
                </div>
              }
              <div class="info-row">
                <span class="info-k">Horas</span>
                <span class="info-v">{{ horaSvc.totalHoras() }}h registradas</span>
              </div>
              <div class="info-row">
                <span class="info-k">Pagos</span>
                <span class="info-v">{{ pagoSvc.pagos().length }} registrados</span>
              </div>
            </div>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      display: grid;
      grid-template-columns: 1fr 240px;
      grid-template-rows: auto auto auto auto 1fr;
      gap: 0 16px;
      max-width: 1020px;
      align-items: start;
    }

    /* Breadcrumb — full width */
    .breadcrumb {
      grid-column: 1 / -1;
      display: flex; align-items: center; gap: 6px;
      font-size: 12.5px; color: var(--ink-3); margin-bottom: 16px;
    }
    .breadcrumb a { color: var(--ink-3); transition: color 0.15s; }
    .breadcrumb a:hover { color: var(--accent-2); }
    .sep { opacity: 0.4; }

    /* Header — full width */
    .proj-header {
      grid-column: 1 / -1;
      margin-bottom: 14px;
    }
    .proj-title { font-size: 1.75rem; font-weight: 600; color: var(--ink); letter-spacing: -0.03em; margin-bottom: 8px; }
    .proj-sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .proj-client { font-size: 13.5px; color: var(--ink-2); font-weight: 500; }
    .proj-dot { color: var(--ink-3); font-size: 10px; }
    .proj-date { font-size: 12.5px; color: var(--ink-3); font-family: var(--mono); }
    .badge { padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 500; }

    /* Métricas — full width */
    .metrics-row {
      grid-column: 1 / -1;
      display: flex; align-items: center;
      background: var(--bg-2); border: 1px solid var(--line);
      border-radius: var(--radius-lg); padding: 16px 20px;
      margin-bottom: 16px;
    }
    .metric { flex: 1; }
    .metric-div { width: 1px; height: 36px; background: var(--line); margin: 0 18px; flex-shrink: 0; }
    .metric-label { display: block; font-size: 10.5px; font-weight: 500; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; }
    .metric-val { font-size: 1.1rem; font-weight: 600; color: var(--ink); font-family: var(--mono); letter-spacing: -0.02em; }
    .metric-val.green { color: var(--green); }
    .metric-val.amber { color: var(--amber); }
    .metric-pct-wrap { display: flex; align-items: center; gap: 8px; }
    .metric-track { flex: 1; height: 4px; background: var(--bg-3); border-radius: 999px; overflow: hidden; max-width: 60px; }
    .metric-fill { height: 100%; border-radius: 999px; transition: width 0.5s; }

    /* Tabs — col 1 */
    .tabs {
      grid-column: 1;
      display: flex; gap: 2px;
      border-bottom: 1px solid var(--line); margin-bottom: 14px;
    }
    .tab {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 14px; border-radius: 8px 8px 0 0;
      background: none; border: none;
      color: var(--ink-3); font-size: 13px; cursor: pointer;
      transition: all 0.15s; position: relative;
    }
    .tab:hover { color: var(--ink-2); background: var(--bg-3); }
    .tab.active {
      color: var(--ink); background: var(--bg-2);
      border: 1px solid var(--line); border-bottom: 1px solid var(--bg-2);
      margin-bottom: -1px;
    }
    .tab-count {
      background: rgba(124,106,247,0.2); color: var(--accent-2);
      border-radius: 999px; padding: 0 6px; font-size: 11px; font-weight: 600;
    }

    /* Tab content — col 1 */
    .tab-content { grid-column: 1; }

    /* Side panel — col 2, rows 4-5 */
    .side-panel { grid-column: 2; grid-row: 4 / 6; display: flex; flex-direction: column; gap: 10px; }

    /* Loading */
    .loading { grid-column: 1/-1; display: flex; justify-content: center; padding: 60px; }
    .spin { width: 28px; height: 28px; border: 2px solid var(--line-2); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Panel */
    .panel { background: var(--bg-2); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 10px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .panel-head-right { display: flex; align-items: center; gap: 10px; }
    .panel-title { font-size: 13.5px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em; margin: 0 0 14px; }
    .panel-head .panel-title { margin: 0; }
    .total-horas { font-size: 12px; color: var(--ink-2); font-family: var(--mono); font-weight: 500; }

    .btn-outline { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: none; border: 1px solid var(--line-2); border-radius: var(--radius); color: var(--ink-2); font-size: 12px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
    .btn-outline:hover { border-color: var(--accent); color: var(--accent-2); }

    /* Inline form */
    .inline-form { background: var(--bg-3); border-radius: var(--radius); padding: 12px; margin-bottom: 14px; }
    .if-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
    .if-field { display: flex; flex-direction: column; gap: 5px; }
    .if-field-wide { flex: 1; min-width: 160px; }
    .if-field label { font-size: 11px; font-weight: 500; color: var(--ink-2); }
    .if-field input, .if-field select { padding: 8px 10px; background: var(--bg-1); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); font-size: 13.5px; font-family: var(--font); }
    .if-field input:focus, .if-field select:focus { outline: none; border-color: var(--accent); }
    .cta-sm { padding: 8px 16px; background: var(--accent); border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; align-self: flex-end; transition: opacity 0.15s; }
    .cta-sm:disabled { opacity: 0.5; cursor: not-allowed; }

    .empty-tab { text-align: center; padding: 28px; color: var(--ink-3); font-size: 13.5px; }

    /* Pagos */
    .pagos-list { display: flex; flex-direction: column; gap: 1px; }
    .pago-row { display: flex; align-items: center; gap: 12px; padding: 10px 8px; border-radius: 8px; transition: background 0.15s; }
    .pago-row:hover { background: var(--bg-3); }
    .pago-row:hover .del-btn { opacity: 1; }
    .pago-num { width: 22px; height: 22px; border-radius: 6px; background: var(--bg-3); color: var(--ink-3); font-size: 11px; font-family: var(--mono); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pago-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .pago-monto { font-size: 14px; font-weight: 600; color: var(--green); font-family: var(--mono); }
    .pago-nota { font-size: 12px; color: var(--ink-3); }
    .pago-fecha { font-size: 12px; color: var(--ink-3); font-family: var(--mono); white-space: nowrap; }
    .del-btn { background: none; border: none; cursor: pointer; color: var(--ink-3); padding: 4px; border-radius: 5px; opacity: 0; transition: all 0.15s; display: flex; }
    .del-btn:hover { color: var(--red); background: var(--red-bg); }

    /* Entregables */
    .ent-list { display: flex; flex-direction: column; gap: 6px; }
    .ent-row { display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-3); border-radius: 8px; }
    .ent-row:hover .del-btn { opacity: 1; }
    .ent-tipo-badge { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .ent-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .ent-nombre { font-size: 13.5px; font-weight: 500; color: var(--ink); }
    .ent-url { font-size: 11.5px; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
    .ent-open { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--accent-2); text-decoration: none; padding: 5px 10px; border-radius: 6px; transition: background 0.15s; white-space: nowrap; }
    .ent-open:hover { background: rgba(124,106,247,0.1); }

    /* Horas */
    .hora-summary { margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
    .hora-cat { display: flex; align-items: center; gap: 10px; font-size: 12.5px; }
    .hora-cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .hora-cat-label { width: 90px; color: var(--ink-2); font-size: 12px; }
    .hora-cat-bar { flex: 1; height: 5px; background: var(--bg-3); border-radius: 999px; overflow: hidden; }
    .hora-cat-fill { height: 100%; border-radius: 999px; transition: width 0.4s; }
    .hora-cat-val { font-family: var(--mono); font-size: 12px; color: var(--ink-2); width: 32px; text-align: right; }
    .horas-list { display: flex; flex-direction: column; gap: 1px; }
    .hora-row { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 8px; transition: background 0.15s; }
    .hora-row:hover { background: var(--bg-3); }
    .hora-row:hover .del-btn { opacity: 1; }
    .hora-cat-badge { padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 500; flex-shrink: 0; }
    .hora-info { flex: 1; }
    .hora-desc { font-size: 13px; color: var(--ink-2); }
    .hora-fecha { font-size: 11.5px; color: var(--ink-3); font-family: var(--mono); white-space: nowrap; }
    .hora-cant { font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; }

    /* Timeline de actividad */
    .timeline { display: flex; flex-direction: column; }
    .tl-item { display: flex; gap: 14px; }
    .tl-left { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
    .tl-icon { width: 30px; height: 30px; border-radius: 50%; background: var(--bg-3); border: 1px solid var(--line-2); display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
    .tl-line { width: 1px; flex: 1; background: var(--line); margin: 4px 0; min-height: 20px; }
    .tl-body { padding: 4px 0 18px; flex: 1; }
    .tl-desc { font-size: 13.5px; color: var(--ink); margin-bottom: 4px; font-weight: 500; }
    .tl-meta { display: flex; align-items: center; gap: 6px; }
    .tl-user { font-size: 11.5px; color: var(--accent-2); }
    .tl-sep { color: var(--ink-3); font-size: 10px; }
    .tl-time { font-size: 11.5px; color: var(--ink-3); }

    /* Side cards */
    .side-card { background: var(--bg-2); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 16px; }
    .side-title { font-size: 12.5px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em; margin: 0 0 12px; text-transform: uppercase; font-size: 10.5px; color: var(--ink-3); letter-spacing: 0.08em; }
    .trans-list { display: flex; flex-direction: column; gap: 4px; }
    .trans-btn { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: var(--radius); background: var(--bg-3); border: 1px solid var(--line); color: var(--ink-2); font-size: 12.5px; cursor: pointer; transition: all 0.15s; width: 100%; }
    .trans-btn:hover { border-color: var(--line-2); color: var(--ink); background: var(--bg-2); }
    .trans-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .trans-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

    .portal-card { background: linear-gradient(135deg, rgba(124,106,247,0.08), rgba(124,106,247,0.02)); border-color: rgba(124,106,247,0.2); }
    .portal-hint { font-size: 12px; color: var(--ink-3); margin-bottom: 10px; line-height: 1.5; }
    .portal-url { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--bg-1); border: 1px solid var(--line); border-radius: 7px; cursor: pointer; margin-bottom: 8px; transition: border-color 0.15s; }
    .portal-url:hover { border-color: var(--accent); }
    .portal-url-text { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
    .portal-copy-icon { color: var(--accent-2); display: flex; }
    .portal-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 8px; background: rgba(124,106,247,0.15); color: var(--accent-2); font-size: 12.5px; text-decoration: none; font-weight: 500; transition: background 0.15s; }
    .portal-btn:hover { background: rgba(124,106,247,0.25); }

    .info-rows { display: flex; flex-direction: column; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--line); }
    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
    .info-k { font-size: 11.5px; color: var(--ink-3); }
    .info-v { font-size: 12.5px; color: var(--ink-2); font-weight: 500; }
    .info-v.mono { font-family: var(--mono); font-size: 12px; }
    /* Presupuesto */
    .btn-pdf {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 14px; border-radius: var(--radius);
      background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.25);
      color: var(--red); font-size: 12.5px; cursor: pointer;
      transition: all 0.15s;
    }
    .btn-pdf:hover { background: rgba(248,113,113,0.2); }
    .btn-pdf:disabled { opacity: 0.5; cursor: not-allowed; }

    .budget-table { width: 100%; border-collapse: collapse; }
    .budget-table th {
      padding: 9px 12px; text-align: left;
      font-size: 11px; font-weight: 600; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.06em;
      border-bottom: 1px solid var(--line);
    }
    .budget-table th.r { text-align: right; }
    .budget-table td {
      padding: 11px 12px; border-bottom: 1px solid var(--line);
      font-size: 13.5px; color: var(--ink-2);
    }
    .budget-table tbody tr:last-child td { border-bottom: 2px solid var(--line-2); }
    .budget-table tfoot td { padding: 12px; }
    .total-label { font-size: 13px; font-weight: 600; color: var(--ink-2); }
    .total-val { font-family: var(--mono); font-size: 1.1rem; font-weight: 700; color: var(--green); text-align: right; }
    .budget-table .r { text-align: right; }
    .budget-table .mono { font-family: var(--mono); font-size: 12.5px; }
    .budget-table .green { color: var(--green); font-weight: 500; }

  `]
})
export class ProyectoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  svc     = inject(ProyectoService);
  pagoSvc = inject(PagoService);
  entSvc  = inject(EntregableService);
  horaSvc = inject(HoraService);
  actSvc  = inject(ActividadService);
  toast   = inject(ToastService);
  private fb = inject(FormBuilder);

  META             = META;
  TRANS            = TRANS;
  CATEGORIAS       = CATEGORIAS;
  TIPO_ICON        = TIPO_ICON;
  TIPO_COLOR       = TIPO_COLOR;
  ACTIVIDAD_ICON   = ACTIVIDAD_ICON;
  categoriasKeys   = Object.keys(CATEGORIAS) as (keyof typeof CATEGORIAS)[];

  proyecto      = signal<Proyecto | null>(null);
  tabActivo     = signal<'pagos'|'entregables'|'horas'|'actividad'|'presupuesto'>('pagos');
  showPagoForm  = signal(false);
  showEntForm   = signal(false);
  showHoraForm  = signal(false);
  savingPago    = signal(false);
  savingEnt     = signal(false);
  savingHora    = signal(false);
  transitioning      = signal(false);
  copiado            = signal(false);
  savingPresupuesto  = signal(false);
  generandoPDF       = signal(false);

  tabs = [
    { id: 'pagos'       as const, label: 'Pagos',        count: () => this.pagoSvc.pagos().length },
    { id: 'entregables' as const, label: 'Entregables',  count: () => this.entSvc.entregables().length },
    { id: 'horas'       as const, label: 'Horas',        count: () => this.horaSvc.horas().length },
    { id: 'actividad'   as const, label: 'Actividad',    count: () => this.actSvc.actividades().length },
    { id: 'presupuesto' as const, label: 'Presupuesto',  count: () => this.proyecto()?.items_presupuesto?.length ?? 0 },
  ];

  pagoForm = this.fb.group({
    monto: [null as number | null, [Validators.required, Validators.min(1)]],
    fecha: [new Date().toISOString().split('T')[0]],
    nota:  [''],
  });

  entForm = this.fb.group({
    nombre: ['', Validators.required],
    url:    ['', Validators.required],
    tipo:   ['link'],
  });

  itemForm = this.fb.group({
    descripcion: ['', Validators.required],
    cantidad:    [1, [Validators.required, Validators.min(1)]],
    precio_unitario: [0, [Validators.required, Validators.min(0)]],
  });

  horaForm = this.fb.group({
    categoria:   ['diseno'],
    cantidad:    [null as number | null, [Validators.required, Validators.min(0.5)]],
    descripcion: [''],
    fecha:       [new Date().toISOString().split('T')[0]],
  });

  pct = computed(() => {
    const p = this.proyecto();
    if (!p || !p.presupuesto) return 0;
    return Math.min(100, Math.round((p.monto_cobrado / p.presupuesto) * 100));
  });

  pendiente = computed(() => {
    const p = this.proyecto();
    return p ? Math.max(0, p.presupuesto - p.monto_cobrado) : 0;
  });

  rentabilidad = computed(() => {
    const p = this.proyecto();
    const horas = this.horaSvc.totalHoras();
    if (!p || !horas) return 0;
    return Math.round(p.monto_cobrado / horas);
  });

  portalUrl = computed(() => {
    const token = this.proyecto()?.token_publico;
    return token ? `${window.location.origin}/p/${token}` : '';
  });

  get id() { return this.route.snapshot.paramMap.get('id')!; }

  async ngOnInit() {
    await this.svc.loadAll();
    this.proyecto.set(this.svc.proyectos().find(p => p.id === this.id) ?? null);
    await Promise.all([
      this.pagoSvc.loadByProyecto(this.id),
      this.entSvc.loadByProyecto(this.id),
      this.horaSvc.loadByProyecto(this.id),
      this.actSvc.loadByProyecto(this.id),
    ]);
  }

  async registrarPago() {
    if (this.pagoForm.invalid) return;
    this.savingPago.set(true);
    try {
      const pago = await this.pagoSvc.registrar({ ...this.pagoForm.value as any, proyecto_id: this.id });
      await this.svc.loadAll();
      this.proyecto.set(this.svc.proyectos().find(p => p.id === this.id) ?? null);
      // Registrar actividad
      await this.actSvc.registrar(this.id, 'pago_registrado',
        `Pago registrado: ${this.fmt(this.pagoForm.value.monto!)}`,
        { monto: this.pagoForm.value.monto }
      );
      this.pagoForm.patchValue({ monto: null, nota: '' });
      this.showPagoForm.set(false);
      this.toast.success('Pago registrado correctamente');
    } catch (e: any) {
      this.toast.error(e.message ?? 'Error al registrar el pago');
    } finally { this.savingPago.set(false); }
  }

  async eliminarPago(pagoId: string) {
    if (!confirm('¿Eliminar este pago?')) return;
    await this.pagoSvc.delete(pagoId);
    await this.svc.loadAll();
    this.proyecto.set(this.svc.proyectos().find(p => p.id === this.id) ?? null);
    await this.actSvc.registrar(this.id, 'pago_eliminado', 'Pago eliminado');
    this.toast.warning('Pago eliminado');
  }

  async agregarEntregable() {
    if (this.entForm.invalid) return;
    this.savingEnt.set(true);
    try {
      const e = await this.entSvc.create({ ...this.entForm.value as any, proyecto_id: this.id });
      await this.actSvc.registrar(this.id, 'entregable_agregado',
        `Entregable agregado: ${e.nombre}`,
        { tipo: e.tipo, url: e.url }
      );
      this.entForm.reset({ tipo: 'link' });
      this.showEntForm.set(false);
      this.toast.success('Entregable agregado');
    } catch (e: any) {
      this.toast.error(e.message ?? 'Error');
    } finally { this.savingEnt.set(false); }
  }

  async eliminarEntregable(id: string) {
    if (!confirm('¿Eliminar este entregable?')) return;
    await this.entSvc.delete(id);
    await this.actSvc.registrar(this.id, 'entregable_eliminado', 'Entregable eliminado');
    this.toast.warning('Entregable eliminado');
  }

  async registrarHora() {
    if (this.horaForm.invalid) return;
    this.savingHora.set(true);
    try {
      const h = await this.horaSvc.create({ ...this.horaForm.value as any, proyecto_id: this.id });
      await this.actSvc.registrar(this.id, 'hora_registrada',
        `${h.cantidad}h de ${CATEGORIAS[h.categoria as keyof typeof CATEGORIAS]?.label ?? h.categoria} registradas`,
        { cantidad: h.cantidad, categoria: h.categoria }
      );
      this.horaForm.patchValue({ cantidad: null, descripcion: '' });
      this.showHoraForm.set(false);
      this.toast.success(`${h.cantidad}h registradas`);
    } catch (e: any) {
      this.toast.error(e.message ?? 'Error');
    } finally { this.savingHora.set(false); }
  }

  async eliminarHora(id: string) {
    if (!confirm('¿Eliminar estas horas?')) return;
    await this.horaSvc.delete(id);
    this.toast.warning('Horas eliminadas');
  }

  async cambiarEstado(estado: EstadoProyecto) {
    this.transitioning.set(true);
    try {
      await this.svc.updateEstado(this.id, estado);
      this.proyecto.set(this.svc.proyectos().find(p => p.id === this.id) ?? null);
      await this.actSvc.loadByProyecto(this.id);
      this.toast.success(`Estado cambiado a ${META[estado].label}`);
    } catch (e: any) {
      this.toast.error('Error al cambiar el estado');
    } finally { this.transitioning.set(false); }
  }

  async copiarPortal() {
    const url = this.portalUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    this.copiado.set(true);
    this.toast.success('Link del portal copiado');
    setTimeout(() => this.copiado.set(false), 2000);
  }

  // ── Presupuesto ────────────────────────────────────────────────────
  totalItems = computed(() => {
    const items = this.proyecto()?.items_presupuesto ?? [];
    return items.reduce((acc, i) => acc + (i.cantidad * i.precio_unitario), 0);
  });

  async agregarItem() {
    if (this.itemForm.invalid) { this.itemForm.markAllAsTouched(); return; }
    const p = this.proyecto();
    if (!p) return;
    const items = [...(p.items_presupuesto ?? []), this.itemForm.value as any];
    await this.svc.update(this.id, { items_presupuesto: items });
    this.proyecto.set(this.svc.proyectos().find(x => x.id === this.id) ?? null);
    this.itemForm.reset({ cantidad: 1, precio_unitario: 0 });
    this.toast.success('Item agregado al presupuesto');
  }

  async quitarItem(index: number) {
    const p = this.proyecto();
    if (!p) return;
    const items = (p.items_presupuesto ?? []).filter((_, i) => i !== index);
    await this.svc.update(this.id, { items_presupuesto: items });
    this.proyecto.set(this.svc.proyectos().find(x => x.id === this.id) ?? null);
    this.toast.warning('Item eliminado');
  }

  generarPDF() {
    const p = this.proyecto();
    if (!p) return;
    this.generandoPDF.set(true);

    const items = p.items_presupuesto ?? [];
    const total = items.reduce((acc, i) => acc + (i.cantidad * i.precio_unitario), 0);
    const fecha = new Date().toLocaleDateString('es-AR', { day:'numeric', month:'long', year:'numeric' });

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Presupuesto — ${p.nombre}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; padding: 48px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #1D3461; padding-bottom: 24px; }
          .agency { font-size: 22px; font-weight: 700; color: #1D3461; }
          .agency-sub { font-size: 12px; color: #6B7280; margin-top: 4px; }
          .doc-info { text-align: right; }
          .doc-label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.08em; }
          .doc-val { font-size: 14px; font-weight: 600; color: #111827; margin-top: 2px; }
          .proyecto-section { margin-bottom: 32px; }
          .section-label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
          .proyecto-nombre { font-size: 20px; font-weight: 700; color: #1D3461; }
          .proyecto-cliente { font-size: 14px; color: #374151; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead { background: #1D3461; }
          th { padding: 10px 14px; text-align: left; color: white; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; }
          th:last-child, td:last-child { text-align: right; }
          td { padding: 11px 14px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151; }
          tr:nth-child(even) td { background: #F9FAFB; }
          .total-row td { background: #EFF6FF; font-weight: 700; color: #1D3461; font-size: 14px; border-top: 2px solid #BFDBFE; border-bottom: none; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="agency">APA Marketing</div>
            <div class="agency-sub">Agencia de Marketing Digital</div>
          </div>
          <div class="doc-info">
            <div class="doc-label">Presupuesto</div>
            <div class="doc-val">${fecha}</div>
          </div>
        </div>

        <div class="proyecto-section">
          <div class="section-label">Proyecto</div>
          <div class="proyecto-nombre">${p.nombre}</div>
          <div class="proyecto-cliente">${p.clientes?.empresa ?? ''} — ${p.clientes?.nombre ?? ''}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th style="text-align:right">Cant.</th>
              <th style="text-align:right">Precio unit.</th>
              <th style="text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(i => `
              <tr>
                <td>${i.descripcion}</td>
                <td style="text-align:right">${i.cantidad}</td>
                <td style="text-align:right">${this.fmt(i.precio_unitario)}</td>
                <td style="text-align:right">${this.fmt(i.cantidad * i.precio_unitario)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3">TOTAL</td>
              <td>${this.fmt(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          Presupuesto generado por APA Dashboard · ${fecha}
        </div>
      </body>
      </html>
    `;

    // Abre en nueva pestaña y dispara la impresión/guardar como PDF
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 500);
    }
    this.generandoPDF.set(false);
  }


  fdRelativo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'Ahora mismo';
    if (mins < 60)  return `Hace ${mins} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7)   return `Hace ${days} días`;
    return this.fd(iso);
  }

  fmt(n: number) {
    return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(n);
  }

  fd(iso: string) {
    return new Date(iso + 'T00:00').toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' });
  }
}