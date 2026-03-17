import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Pago } from '../models';

@Injectable({ providedIn: 'root' })
export class PagoService {
  private sb = inject(SupabaseService).client;

  readonly pagos   = signal<Pago[]>([]);
  readonly loading = signal(false);

  async loadByProyecto(proyectoId: string) {
    this.loading.set(true);
    const { data, error } = await this.sb
      .from('pagos')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .order('fecha', { ascending: false });
    this.loading.set(false);
    if (error) throw error;
    this.pagos.set(data ?? []);
  }

  async registrar(body: Partial<Pago>) {
    const { data, error } = await this.sb
      .from('pagos')
      .insert(body)
      .select()
      .single();
    if (error) throw error;
    this.pagos.update(list => [data, ...list]);
    return data;
  }

  async delete(id: string) {
    const { error } = await this.sb.from('pagos').delete().eq('id', id);
    if (error) throw error;
    this.pagos.update(list => list.filter(p => p.id !== id));
  }
}
