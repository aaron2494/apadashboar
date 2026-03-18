import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Actividad, TipoActividad } from '../models';

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private sb = inject(SupabaseService).client;

  readonly actividades = signal<Actividad[]>([]);
  readonly loading     = signal(false);

  async loadByProyecto(proyectoId: string) {
    this.loading.set(true);
    const { data } = await this.sb
      .from('actividad')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .order('created_at', { ascending: false })
      .limit(50);
    this.loading.set(false);
    this.actividades.set(data ?? []);
  }

  async registrar(
    proyectoId: string,
    tipo: TipoActividad,
    descripcion: string,
    metadata: Record<string, any> = {},
    usuarioEmail?: string
  ) {
    const { data, error } = await this.sb
      .from('actividad')
      .insert({ proyecto_id: proyectoId, tipo, descripcion, metadata, usuario_email: usuarioEmail })
      .select()
      .single();
    if (error) throw error;
    // Agregar al inicio del feed local
    this.actividades.update(list => [data, ...list]);
    return data;
  }
}
