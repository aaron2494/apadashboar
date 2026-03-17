import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { VistaPublicaProyecto, Pago, Entregable } from '../models';

@Injectable({ providedIn: 'root' })
export class PortalService {
  private sb = inject(SupabaseService).client;

  readonly proyecto     = signal<VistaPublicaProyecto | null>(null);
  readonly pagos        = signal<Pago[]>([]);
  readonly entregables  = signal<Entregable[]>([]);
  readonly loading      = signal(true);
  readonly notFound     = signal(false);

  async loadByToken(token: string) {
    this.loading.set(true);
    this.notFound.set(false);

    // Buscar proyecto por token público
    const { data: proj } = await this.sb
      .from('vista_publica_proyecto')
      .select('*')
      .eq('token_publico', token)
      .single();

    if (!proj) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.proyecto.set(proj);

    // Cargar pagos y entregables en paralelo
    const [pagosRes, entregablesRes] = await Promise.all([
      this.sb.from('pagos').select('*').eq('proyecto_id', proj.id).order('fecha', { ascending: false }),
      this.sb.from('entregables').select('*').eq('proyecto_id', proj.id).order('created_at', { ascending: false }),
    ]);

    this.pagos.set(pagosRes.data ?? []);
    this.entregables.set(entregablesRes.data ?? []);
    this.loading.set(false);
  }
}
