import { Injectable, signal } from '@angular/core';

export type ToastTipo = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  tipo: ToastTipo;
  mensaje: string;
  duracion?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  private agregar(tipo: ToastTipo, mensaje: string, duracion = 3500) {
    const id = crypto.randomUUID();
    this.toasts.update(list => [...list, { id, tipo, mensaje, duracion }]);
    setTimeout(() => this.quitar(id), duracion);
  }

  success(mensaje: string)  { this.agregar('success', mensaje); }
  error(mensaje: string)    { this.agregar('error', mensaje, 5000); }
  warning(mensaje: string)  { this.agregar('warning', mensaje, 4000); }
  info(mensaje: string)     { this.agregar('info', mensaje); }

  quitar(id: string) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
