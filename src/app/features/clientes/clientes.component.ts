import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ClienteService } from '../../core/services/cliente.service';
import { Cliente } from '../../core/models';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <p class="eyebrow">Base de contactos</p>
          <h1 class="page-title">Clientes</h1>
        </div>
        <div class="head-right">
          <div class="search-wrap">
            <svg class="search-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" [(ngModel)]="q" placeholder="Buscar cliente..." class="search" />
          </div>
          <button class="cta" (click)="openModal()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Agregar
          </button>
        </div>
      </div>

      <!-- Contador -->
      <div class="count-row">
        <span class="count-label">{{ filtrados().length }} cliente{{ filtrados().length !== 1 ? 's' : '' }}
          @if (q) { <span class="count-q"> — "{{ q }}"</span> }
        </span>
      </div>

      @if (showModal()) {
        <div class="overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h2>{{ editId() ? 'Editar cliente' : 'Nuevo cliente' }}</h2>
              <button class="close-btn" (click)="closeModal()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form [formGroup]="form" (ngSubmit)="guardar()">
              <div class="form-grid">
                <div class="field">
                  <label>Nombre <span class="req">*</span></label>
                  <input formControlName="nombre" placeholder="Juan López" />
                </div>
                <div class="field">
                  <label>Empresa <span class="req">*</span></label>
                  <input formControlName="empresa" placeholder="Empresa S.A." />
                </div>
                <div class="field">
                  <label>Email</label>
                  <input formControlName="email" type="email" placeholder="juan@empresa.com" />
                </div>
                <div class="field">
                  <label>Teléfono</label>
                  <input formControlName="telefono" placeholder="11-XXXX-XXXX" />
                </div>
              </div>
              <div class="field">
                <label>Notas internas</label>
                <textarea formControlName="notas" rows="2" placeholder="Observaciones del cliente..."></textarea>
              </div>
              @if (modalError()) {
                <div class="err">{{ modalError() }}</div>
              }
              <div class="modal-foot">
                <button type="button" class="btn-ghost" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="cta" [disabled]="saving()">
                  @if (saving()) { Guardando... } @else { Guardar cliente }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (svc.loading()) {
        <div class="grid">
          @for (i of [1,2,3,4,5,6]; track i) { <div class="card skeleton"></div> }
        </div>
      } @else if (filtrados().length === 0) {
        <div class="empty">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
              <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
            </svg>
          </div>
          <p>{{ q ? 'Sin resultados para "' + q + '"' : 'No hay clientes todavía' }}</p>
          @if (!q) {
            <button class="cta" (click)="openModal()">Agregar primer cliente</button>
          }
        </div>
      } @else {
        <div class="grid">
          @for (c of filtrados(); track c.id) {
            <div class="card">
              <div class="card-top">
                <div class="avatar" [attr.data-char]="initials(c)">{{ initials(c) }}</div>
                <div class="card-actions">
                  <button class="icon-btn" (click)="openEdit(c)" title="Editar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="icon-btn danger" (click)="eliminar(c.id)" title="Eliminar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="card-body">
                <p class="card-name">{{ c.nombre }}</p>
                <p class="card-empresa">{{ c.empresa }}</p>
              </div>
              <div class="card-foot">
                @if (c.email) {
                  <span class="card-detail">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {{ c.email }}
                  </span>
                }
                @if (c.telefono) {
                  <span class="card-detail">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.39 18a19.5 19.5 0 0 1-4.5-4.5A19.79 19.79 0 0 1 3.1 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 5 5l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    {{ c.telefono }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 920px; }
    .page-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 16px; }
    .eyebrow { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent-2); margin-bottom: 4px; }
    .page-title { font-size: 1.625rem; font-weight: 600; color: var(--ink); letter-spacing: -0.03em; }
    .head-right { display: flex; gap: 8px; align-items: center; }

    .search-wrap { position: relative; }
    .search-ico { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--ink-3); pointer-events: none; }
    .search { padding: 9px 12px 9px 30px; background: var(--bg-2); border: 1px solid var(--line); border-radius: var(--radius); color: var(--ink); font-size: 13.5px; width: 220px; transition: border-color 0.15s; }
    .search:focus { outline: none; border-color: var(--accent); }

    .cta { display: flex; align-items: center; gap: 7px; padding: 9px 16px; background: var(--accent); border: none; border-radius: var(--radius); color: white; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; white-space: nowrap; }
    .cta:hover { opacity: 0.88; }
    .cta:disabled { opacity: 0.5; cursor: not-allowed; }

    .count-row { margin-bottom: 18px; }
    .count-label { font-size: 12.5px; color: var(--ink-3); }
    .count-q { color: var(--accent-2); }

    /* Grid */
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 10px; }

    .card {
      background: var(--bg-2);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 16px;
      transition: border-color 0.2s, transform 0.15s;
    }
    .card:hover { border-color: var(--line-2); transform: translateY(-1px); }
    .card.skeleton { height: 148px; animation: shimmer 1.4s ease infinite; background: linear-gradient(90deg,var(--bg-2) 25%,var(--bg-3) 50%,var(--bg-2) 75%); background-size: 200% 100%; }
    @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }

    .card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }

    .avatar {
      width: 40px; height: 40px; border-radius: 11px;
      background: linear-gradient(135deg, rgba(124,106,247,0.25), rgba(124,106,247,0.08));
      border: 1px solid rgba(124,106,247,0.2);
      color: var(--accent-2);
      font-size: 14px; font-weight: 600;
      display: flex; align-items: center; justify-content: center;
      letter-spacing: 0;
    }

    .card-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
    .card:hover .card-actions { opacity: 1; }

    .icon-btn { background: none; border: none; cursor: pointer; color: var(--ink-3); padding: 5px; border-radius: 6px; display: flex; align-items: center; transition: all 0.15s; }
    .icon-btn:hover { background: var(--bg-3); color: var(--ink-2); }
    .icon-btn.danger:hover { background: var(--red-bg); color: var(--red); }

    .card-name { font-size: 14px; font-weight: 500; color: var(--ink); letter-spacing: -0.01em; margin-bottom: 2px; }
    .card-empresa { font-size: 12.5px; color: var(--accent-2); font-weight: 500; }

    .card-foot { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 5px; }
    .card-detail { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-3); }

    /* Empty */
    .empty { text-align: center; padding: 60px 20px; color: var(--ink-3); display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .empty-icon { width: 52px; height: 52px; border-radius: 14px; background: var(--bg-2); border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; color: var(--ink-3); }
    .empty p { font-size: 14px; color: var(--ink-3); }

    /* Modal */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .modal { background: var(--bg-2); border: 1px solid var(--line-2); border-radius: 18px; padding: 24px; width: 100%; max-width: 480px; }
    .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .modal-head h2 { font-size: 15px; font-weight: 600; color: var(--ink); letter-spacing: -0.02em; }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--ink-3); padding: 4px; border-radius: 6px; display: flex; transition: all 0.15s; }
    .close-btn:hover { background: var(--bg-3); color: var(--ink); }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .field label { font-size: 12px; font-weight: 500; color: var(--ink-2); }
    .req { color: var(--accent-2); }
    .field input, .field textarea {
      padding: 9px 12px; background: var(--bg-1); border: 1px solid var(--line); border-radius: var(--radius);
      color: var(--ink); font-size: 13.5px; font-family: var(--font); resize: vertical;
      transition: border-color 0.15s;
    }
    .field input:focus, .field textarea:focus { outline: none; border-color: var(--accent); }

    .err { background: var(--red-bg); border: 1px solid rgba(248,113,113,0.2); border-radius: var(--radius); color: var(--red); font-size: 13px; padding: 9px 12px; margin-bottom: 12px; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 8px; }
    .btn-ghost { padding: 9px 14px; border-radius: var(--radius); border: 1px solid var(--line-2); background: none; color: var(--ink-2); font-size: 13px; cursor: pointer; transition: all 0.15s; }
    .btn-ghost:hover { background: var(--bg-3); }
  `]
})
export class ClientesComponent implements OnInit {
  svc = inject(ClienteService);
  private fb = inject(FormBuilder);

  q         = '';
  showModal = signal(false);
  editId    = signal<string | null>(null);
  saving    = signal(false);
  modalError = signal('');

  form = this.fb.group({
    nombre:   ['', Validators.required],
    empresa:  ['', Validators.required],
    email:    ['', Validators.email],
    telefono: [''],
    notas:    [''],
  });

  filtrados = computed(() =>
    this.svc.clientes().filter(c =>
      !this.q || c.nombre.toLowerCase().includes(this.q.toLowerCase()) ||
      c.empresa.toLowerCase().includes(this.q.toLowerCase())
    )
  );

  ngOnInit() { this.svc.loadAll(); }

  openModal() { this.form.reset(); this.editId.set(null); this.showModal.set(true); }
  openEdit(c: Cliente) {
    this.editId.set(c.id);
    this.form.patchValue({ nombre: c.nombre, empresa: c.empresa, email: c.email ?? '', telefono: c.telefono ?? '', notas: c.notas ?? '' });
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); this.modalError.set(''); }

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

  async eliminar(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return;
    await this.svc.delete(id);
  }

  initials(c: Cliente) {
    return (c.nombre[0] + c.empresa[0]).toUpperCase();
  }
}
