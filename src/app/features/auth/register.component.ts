import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { environment } from '../../../environments/environment';

// Validador custom: la frase de acceso debe coincidir
function passphraseValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === environment.registerPassphrase
    ? null
    : { wrongPassphrase: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="scene">
      <div class="glow"></div>
      <div class="card">
        <div class="card-header">
          <div class="mark">
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <rect x="0" y="0" width="8" height="8" rx="2" fill="#7c6af7"/>
              <rect x="10" y="0" width="8" height="8" rx="2" fill="#9d8fff" opacity=".6"/>
              <rect x="0" y="10" width="8" height="8" rx="2" fill="#9d8fff" opacity=".4"/>
              <rect x="10" y="10" width="8" height="8" rx="2" fill="#7c6af7" opacity=".2"/>
            </svg>
          </div>
          <h1 class="heading">Crear cuenta</h1>
          <p class="sub">Acceso interno — APA Marketing</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">

          <div class="field">
            <label>Nombre completo</label>
            <input type="text" formControlName="nombre"
                   placeholder="Tu nombre" autocomplete="name" />
            @if (touched('nombre') && form.get('nombre')?.errors?.['required']) {
              <span class="field-err">El nombre es obligatorio</span>
            }
          </div>

          <div class="field">
            <label>Email</label>
            <input type="email" formControlName="email"
                   placeholder="tu@apamarketing.com" autocomplete="email" />
            @if (touched('email') && form.get('email')?.errors?.['email']) {
              <span class="field-err">Email inválido</span>
            }
          </div>

          <div class="field">
            <label>Contraseña</label>
            <input type="password" formControlName="password"
                   placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
            @if (touched('password') && form.get('password')?.errors?.['minlength']) {
              <span class="field-err">Mínimo 6 caracteres</span>
            }
          </div>

          <div class="field">
            <label>Frase de acceso</label>
            <input type="password" formControlName="passphrase"
                   placeholder="Preguntale a tu equipo" />
            @if (touched('passphrase') && form.get('passphrase')?.errors?.['wrongPassphrase']) {
              <span class="field-err">Frase incorrecta</span>
            }
          </div>

          @if (serverError()) {
            <div class="err">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ serverError() }}
            </div>
          }

          <button type="submit" [disabled]="loading()" class="submit">
            @if (loading()) {
              <span class="dot-pulse"></span>
            } @else {
              Crear cuenta
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            }
          </button>
        </form>

        <p class="footer-link">
          ¿Ya tenés cuenta?
          <a routerLink="/auth/login">Iniciá sesión</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .scene {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg);
      padding: 1rem;
      position: relative; overflow: hidden;
    }
    .glow {
      position: absolute; width: 600px; height: 600px; border-radius: 50%;
      background: radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 70%);
      top: 50%; left: 50%; transform: translate(-50%,-50%);
      pointer-events: none;
    }
    .card {
      width: 100%; max-width: 400px;
      background: var(--bg-2);
      border: 1px solid var(--line-2);
      border-radius: 18px;
      padding: 36px 32px 28px;
      position: relative; z-index: 1;
    }
    .card-header { text-align: center; margin-bottom: 28px; }
    .mark {
      width: 48px; height: 48px;
      background: var(--bg-3); border: 1px solid var(--line-2);
      border-radius: 13px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
    }
    .heading { font-size: 1.25rem; font-weight: 600; color: var(--ink); letter-spacing: -0.03em; margin-bottom: 6px; }
    .sub { font-size: 13.5px; color: var(--ink-3); }

    .form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 12.5px; font-weight: 500; color: var(--ink-2); }
    .field input {
      padding: 10px 14px;
      background: var(--bg-1); border: 1px solid var(--line-2);
      border-radius: var(--radius); color: var(--ink); font-size: 14px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .field-err { font-size: 12px; color: var(--red); }

    .err {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px;
      background: var(--red-bg); border: 1px solid rgba(248,113,113,0.2);
      border-radius: var(--radius); color: var(--red); font-size: 13px;
    }
    .submit {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 11px; background: var(--accent); border: none;
      border-radius: var(--radius); color: white;
      font-size: 14px; font-weight: 500; cursor: pointer;
      transition: opacity 0.15s, transform 0.1s; margin-top: 4px;
    }
    .submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
    .submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .dot-pulse {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
      border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .footer-link { text-align: center; margin-top: 20px; font-size: 13px; color: var(--ink-3); }
    .footer-link a { color: var(--accent-2); }
  `]
})
export class RegisterComponent {
  private sb     = inject(SupabaseService).client;
  private router = inject(Router);
  private fb     = inject(FormBuilder);

  loading     = signal(false);
  serverError = signal('');

  form = this.fb.group({
    nombre:     ['', Validators.required],
    email:      ['', [Validators.required, Validators.email]],
    password:   ['', [Validators.required, Validators.minLength(6)]],
    passphrase: ['', [Validators.required, passphraseValidator]],
  });

  touched(field: string) {
    return this.form.get(field)?.touched;
  }

  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.serverError.set('');

    const { nombre, email, password } = this.form.value;

    const { data, error } = await this.sb.auth.signUp({
      email: email!,
      password: password!,
      options: {
        data: { nombre }   // guarda el nombre en el perfil de Supabase
      }
    });

    if (error) {
      this.serverError.set(
        error.message.includes('already registered')
          ? 'Ese email ya tiene una cuenta'
          : error.message
      );
      this.loading.set(false);
      return;
    }

    // Supabase puede requerir confirmación de email según la config
    // Si email confirm está desactivado, loguea directamente
    if (data.session) {
      this.router.navigate(['/dashboard']);
    } else {
      this.serverError.set('Revisá tu email para confirmar la cuenta');
      this.loading.set(false);
    }
  }
}
