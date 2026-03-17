import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Hora, CategoriaHora } from '../models';

export const CATEGORIAS: Record<CategoriaHora, { label: string; color: string }> = {
  diseno:     { label: 'Diseño',      color: '#a78bfa' },
  desarrollo: { label: 'Desarrollo',  color: '#60a5fa' },
  redes:      { label: 'Redes',       color: '#34d399' },
  ads:        { label: 'Publicidad',  color: '#fbbf24' },
  reunion:    { label: 'Reunión',     color: '#f87171' },
  otro:       { label: 'Otro',        color: '#94a3b8' },
};

@Injectable({ providedIn: 'root' })
export class HoraService {
  private sb = inject(SupabaseService).client;

  readonly horas   = signal<Hora[]>([]);
  readonly loading = signal(false);

  // computed: total de horas
  readonly totalHoras = computed(() =>
    this.horas().reduce((acc, h) => acc + h.cantidad, 0)
  );

  // computed: horas agrupadas por categoría
  readonly porCategoria = computed(() => {
    const map: Record<string, number> = {};
    this.horas().forEach(h => {
      map[h.categoria] = (map[h.categoria] ?? 0) + h.cantidad;
    });
    return map;
  });

  async loadByProyecto(proyectoId: string) {
    this.loading.set(true);
    const { data } = await this.sb
      .from('horas').select('*')
      .eq('proyecto_id', proyectoId).order('fecha', { ascending: false });
    this.loading.set(false);
    this.horas.set(data ?? []);
  }

  async create(body: Partial<Hora>) {
    const { data, error } = await this.sb
      .from('horas').insert(body).select().single();
    if (error) throw error;
    this.horas.update(l => [data, ...l]);
    return data;
  }

  async delete(id: string) {
    const { error } = await this.sb.from('horas').delete().eq('id', id);
    if (error) throw error;
    this.horas.update(l => l.filter(h => h.id !== id));
  }
}
