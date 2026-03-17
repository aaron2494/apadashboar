import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
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
          <h1 class="heading">Bienvenido de vuelta</h1>
          <p class="sub">Ingresá a APA Dashboard</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
          <div class="field">
            <label>Email</label>
            <input type="email" formControlName="email"
                   placeholder="tu@email.com" autocomplete="email" />
          </div>
          <div class="field">
            <label>Contraseña</label>
            <input type="password" formControlName="password"
                   placeholder="••••••••" autocomplete="current-password" />
          </div>

          @if (error()) {
            <div class="err">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ error() }}
            </div>
          }

          <button type="submit" [disabled]="loading()" class="submit">
            @if (loading()) {
              <span class="dot-pulse"></span>
            } @else {
              Ingresar
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            }
          </button>
        </form>

        <p class="hint">demo&#64;apamarketing.com / demo1234</p>
      </div>
    </div>
  `,
  styles: [`
    .scene {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      padding: 1rem;
      position: relative;
      overflow: hidden;
    }
    .glow {
      position: absolute;
      width: 600px; height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 70%);
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }

    .card {
      width: 100%;
      max-width: 380px;
      background: var(--bg-2);
      border: 1px solid var(--line-2);
      border-radius: 18px;
      padding: 36px 32px 28px;
      position: relative;
      z-index: 1;
    }

    .card-header { text-align: center; margin-bottom: 28px; }
    .mark {
      width: 48px; height: 48px;
      background: var(--bg-3);
      border: 1px solid var(--line-2);
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
      background: var(--bg-1);
      border: 1px solid var(--line-2);
      border-radius: var(--radius);
      color: var(--ink);
      font-size: 14px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }

    .err {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px;
      background: var(--red-bg);
      border: 1px solid rgba(248,113,113,0.2);
      border-radius: var(--radius);
      color: var(--red);
      font-size: 13px;
    }

    .submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px;
      background: var(--accent);
      border: none;
      border-radius: var(--radius);
      color: white;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
      margin-top: 4px;
    }
    .submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
    .submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .dot-pulse {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .hint {
      text-align: center;
      margin-top: 20px;
      font-size: 11.5px;
      color: var(--ink-3);
      font-family: var(--mono);
    }
  `]
})
export class LoginComponent {
  private sb     = inject(SupabaseService).client;
  private router = inject(Router);
  private fb     = inject(FormBuilder);

  loading = signal(false);
  error   = signal('');

  form = this.fb.group({
    email:    ['demo@apamarketing.com', [Validators.required, Validators.email]],
    password: ['demo1234', Validators.required],
  });

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.value;
    const { error } = await this.sb.auth.signInWithPassword({ email: email!, password: password! });
    if (error) { this.error.set('Email o contraseña incorrectos'); this.loading.set(false); }
    else this.router.navigate(['/dashboard']);
  }
}
