import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  template: `
    <div class="toast-wrap">
      @for (t of svc.toasts(); track t.id) {
        <div class="toast toast-{{ t.tipo }}" (click)="svc.quitar(t.id)">
          <span class="toast-icon">
            @switch (t.tipo) {
              @case ('success') { ✓ }
              @case ('error')   { ✕ }
              @case ('warning') { ⚠ }
              @case ('info')    { i }
            }
          </span>
          <span class="toast-msg">{{ t.mensaje }}</span>
          <button class="toast-close" (click)="svc.quitar(t.id)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-wrap {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid transparent;
      font-size: 13.5px;
      font-weight: 500;
      min-width: 280px;
      max-width: 400px;
      pointer-events: all;
      cursor: pointer;
      backdrop-filter: blur(8px);
      animation: slideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(20px) scale(0.95); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }

    .toast-success {
      background: rgba(20, 83, 45, 0.95);
      border-color: rgba(52, 211, 153, 0.3);
      color: #6ee7b7;
    }
    .toast-error {
      background: rgba(127, 29, 29, 0.95);
      border-color: rgba(248, 113, 113, 0.3);
      color: #fca5a5;
    }
    .toast-warning {
      background: rgba(120, 53, 15, 0.95);
      border-color: rgba(251, 191, 36, 0.3);
      color: #fcd34d;
    }
    .toast-info {
      background: rgba(30, 58, 138, 0.95);
      border-color: rgba(96, 165, 250, 0.3);
      color: #93c5fd;
    }

    .toast-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .toast-msg { flex: 1; line-height: 1.4; }

    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      color: inherit;
      opacity: 0.6;
      padding: 2px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      transition: opacity 0.15s;
    }
    .toast-close:hover { opacity: 1; }
  `]
})
export class ToastsComponent {
  svc = inject(ToastService);
}
