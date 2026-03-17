import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Entregable } from '../models';

@Injectable({ providedIn: 'root' })
export class EntregableService {
  private sb = inject(SupabaseService).client;

  readonly entregables = signal<Entregable[]>([]);
  readonly loading     = signal(false);

  async loadByProyecto(proyectoId: string) {
    this.loading.set(true);
    const { data } = await this.sb
      .from('entregables').select('*')
      .eq('proyecto_id', proyectoId).order('created_at', { ascending: false });
    this.loading.set(false);
    this.entregables.set(data ?? []);
  }

  async create(body: Partial<Entregable>) {
    const { data, error } = await this.sb
      .from('entregables').insert(body).select().single();
    if (error) throw error;
    this.entregables.update(l => [data, ...l]);
    return data;
  }

  async delete(id: string) {
    const { error } = await this.sb.from('entregables').delete().eq('id', id);
    if (error) throw error;
    this.entregables.update(l => l.filter(e => e.id !== id));
  }
}
