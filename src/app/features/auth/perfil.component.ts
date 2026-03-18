import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <p class="eyebrow">Tu cuenta</p>
          <h1 class="page-title">Perfil</h1>
        </div>
      </div>

      <div class="panels">
        <!-- Datos personales -->
        <div class="panel">
          <h2 class="panel-title">Datos personales</h2>
          <form [formGroup]="infoForm" (ngSubmit)="guardarInfo()">
            <div class="field">
              <label>Nombre</label>
              <input formControlName="nombre" placeholder="Tu nombre" />
            </div>
            <div class="field">
              <label>Email</label>
              <input type="email" formControlName="email" [readonly]="true" class="readonly" />
              <span class="field-hint">El email no se puede cambiar</span>
            </div>
            @if (infoMsg()) {
              <div class="msg" [class.err]="infoErr()">{{ infoMsg() }}</div>
            }
            <button type="submit" class="cta" [disabled]="savingInfo()">
              @if (savingInfo()) { Guardando... } @else { Guardar cambios }
            </button>
          </form>
        </div>

        <!-- Cambiar contraseña -->
        <div class="panel">
          <h2 class="panel-title">Cambiar contraseña</h2>
          <form [formGroup]="passForm" (ngSubmit)="cambiarPassword()">
            <div class="field">
              <label>Nueva contraseña</label>
              <input type="password" formControlName="password" placeholder="Mínimo 6 caracteres" />
              @if (passForm.get('password')?.touched && passForm.get('password')?.errors?.['minlength']) {
                <span class="field-err">Mínimo 6 caracteres</span>
              }
            </div>
            <div class="field">
              <label>Confirmar contraseña</label>
              <input type="password" formControlName="confirmar" placeholder="Repetí la contraseña" />
              @if (passForm.errors?.['noCoincide'] && passForm.get('confirmar')?.touched) {
                <span class="field-err">Las contraseñas no coinciden</span>
              }
            </div>
            @if (passMsg()) {
              <div class="msg" [class.err]="passErr()">{{ passMsg() }}</div>
            }
            <button type="submit" class="cta" [disabled]="savingPass()">
              @if (savingPass()) { Cambiando... } @else { Cambiar contraseña }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 640px; }
    .page-head { margin-bottom: 24px; }
    .eyebrow { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent-2); margin-bottom: 4px; }
    .page-title { font-size: 1.625rem; font-weight: 600; color: var(--ink); letter-spacing: -0.03em; }

    .panels { display: flex; flex-direction: column; gap: 14px; }
    .panel { background: var(--bg-2); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 22px; }
    .panel-title { font-size: 14px; font-weight: 600; color: var(--ink); margin: 0 0 18px; letter-spacing: -0.01em; }

    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field label { font-size: 12.5px; font-weight: 500; color: var(--ink-2); }
    .field input {
      padding: 10px 14px; background: var(--bg-1); border: 1px solid var(--line-2);
      border-radius: var(--radius); color: var(--ink); font-size: 14px;
      transition: border-color 0.15s;
    }
    .field input:focus { outline: none; border-color: var(--accent); }
    .field input.readonly { opacity: 0.5; cursor: not-allowed; }
    .field-hint { font-size: 11.5px; color: var(--ink-3); }
    .field-err  { font-size: 12px; color: var(--red); }

    .msg { font-size: 13px; padding: 9px 12px; border-radius: var(--radius); margin-bottom: 12px; background: var(--green-bg); color: var(--green); border: 1px solid rgba(52,211,153,0.2); }
    .msg.err { background: var(--red-bg); color: var(--red); border-color: rgba(248,113,113,0.2); }

    .cta { display: flex; align-items: center; gap: 7px; padding: 9px 18px; background: var(--accent); border: none; border-radius: var(--radius); color: white; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; }
    .cta:hover { opacity: 0.88; }
    .cta:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class PerfilComponent implements OnInit {
  private sb = inject(SupabaseService).client;
  private fb = inject(FormBuilder);

  savingInfo = signal(false);
  savingPass = signal(false);
  infoMsg    = signal('');
  passMsg    = signal('');
  infoErr    = signal(false);
  passErr    = signal(false);

  infoForm = this.fb.group({
    nombre: ['', Validators.required],
    email:  [{ value: '', disabled: true }],
  });

  passForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmar:['', Validators.required],
  }, { validators: (g) => g.get('password')?.value === g.get('confirmar')?.value ? null : { noCoincide: true } });

  async ngOnInit() {
    const { data: { user } } = await this.sb.auth.getUser();
    if (user) {
      this.infoForm.patchValue({
        nombre: user.user_metadata?.['nombre'] ?? '',
        email:  user.email ?? '',
      });
    }
  }

  async guardarInfo() {
    if (this.infoForm.invalid) return;
    this.savingInfo.set(true);
    const { error } = await this.sb.auth.updateUser({
      data: { nombre: this.infoForm.get('nombre')?.value }
    });
    this.infoErr.set(!!error);
    this.infoMsg.set(error ? error.message : '✓ Datos actualizados correctamente');
    this.savingInfo.set(false);
  }

  async cambiarPassword() {
    if (this.passForm.invalid) { this.passForm.markAllAsTouched(); return; }
    this.savingPass.set(true);
    const { error } = await this.sb.auth.updateUser({
      password: this.passForm.get('password')?.value!
    });
    this.passErr.set(!!error);
    this.passMsg.set(error ? error.message : '✓ Contraseña actualizada correctamente');
    this.passForm.reset();
    this.savingPass.set(false);
  }
}
