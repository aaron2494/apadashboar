import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="rail">
        <div class="rail-top">
          <div class="logo">
            <div class="logo-mark">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="0" y="0" width="8" height="8" rx="2" fill="#7c6af7"/>
                <rect x="10" y="0" width="8" height="8" rx="2" fill="#9d8fff" opacity=".6"/>
                <rect x="0" y="10" width="8" height="8" rx="2" fill="#9d8fff" opacity=".4"/>
                <rect x="10" y="10" width="8" height="8" rx="2" fill="#7c6af7" opacity=".2"/>
              </svg>
            </div>
            <div class="logo-text">
              <span class="logo-name">APA Dashboard</span>
              <span class="logo-tag">Marketing</span>
            </div>
          </div>

          <nav class="nav">
            @for (item of navItems; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="is-active"
                 [routerLinkActiveOptions]="{exact: item.exact ?? false}"
                 class="nav-link">
                <span class="nav-icon" [innerHTML]="item.icon"></span>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            }
          </nav>
        </div>

        <div class="rail-bottom">
          <div class="rail-line"></div>
          <button class="sign-out" (click)="logout()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div class="stage">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      min-height: 100vh;
    }

    /* ── Rail ─────────────────────────────────── */
    .rail {
      width: 210px;
      flex-shrink: 0;
      background: var(--bg-1);
      border-right: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .rail-top { display: flex; flex-direction: column; gap: 0; }

    /* Logo */
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px 18px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 8px;
    }
    .logo-mark {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: var(--bg-3);
      border: 1px solid var(--line-2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo-name { display: block; font-size: 13px; font-weight: 600; color: var(--ink); letter-spacing: -0.02em; }
    .logo-tag  { display: block; font-size: 10px; color: var(--ink-3); font-weight: 400; letter-spacing: 0.04em; text-transform: uppercase; margin-top: 1px; }

    /* Nav */
    .nav { padding: 4px 8px; display: flex; flex-direction: column; gap: 1px; }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 8px 10px;
      border-radius: 8px;
      color: var(--ink-3);
      font-size: 13.5px;
      font-weight: 400;
      transition: color 0.15s, background 0.15s;
      position: relative;
    }
    .nav-link:hover { color: var(--ink-2); background: var(--line); }
    .nav-link.is-active {
      color: var(--ink);
      background: rgba(124,106,247,0.12);
    }
    .nav-link.is-active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 2px;
      height: 16px;
      background: var(--accent);
      border-radius: 1px;
    }
    .nav-icon { display: flex; opacity: 0.7; flex-shrink: 0; }
    .nav-link.is-active .nav-icon { opacity: 1; }
    .nav-label { flex: 1; }

    /* Rail bottom */
    .rail-bottom { padding: 12px 8px 16px; }
    .rail-line { height: 1px; background: var(--line); margin-bottom: 12px; }

    .sign-out {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      border-radius: 8px;
      background: none;
      border: none;
      color: var(--ink-3);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .sign-out:hover { color: var(--red); background: var(--red-bg); }

    /* ── Stage ────────────────────────────────── */
    .stage {
      flex: 1;
      min-width: 0;
      padding: 32px 36px;
      overflow-y: auto;
    }
  `]
})
export class LayoutComponent {
  private sb     = inject(SupabaseService).client;
  private router = inject(Router);

  navItems = [
    {
      path: '/dashboard', label: 'Dashboard', exact: true,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>`
    },
    {
      path: '/clientes', label: 'Clientes', exact: false,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
      </svg>`
    },
    {
      path: '/proyectos', label: 'Proyectos', exact: false,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>`
    },
  ];

  async logout() {
    await this.sb.auth.signOut();
    this.router.navigate(['/auth/login']);
  }
}
