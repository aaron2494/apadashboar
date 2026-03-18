import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Proyecto, EstadoProyecto } from '../models';

const ESTADO_LABEL: Record<EstadoProyecto, string> = {
  EN_PROGRESO: 'En progreso',
  PAUSADO:     'Pausado',
  COMPLETADO:  'Completado',
  CANCELADO:   'Cancelado',
};

@Injectable({ providedIn: 'root' })
export class ProyectoService {
  private sb = inject(SupabaseService).client;

  readonly proyectos = signal<Proyecto[]>([]);
  readonly loading   = signal(false);

  // Helper para obtener email del usuario actual
  private async getUserEmail(): Promise<string> {
    const { data: { user } } = await this.sb.auth.getUser();
    return user?.email ?? 'sistema';
  }

  // Helper para registrar actividad sin romper si falla
  private async logActividad(
    proyectoId: string,
    tipo: string,
    descripcion: string,
    metadata: Record<string, any> = {}
  ) {
    try {
      const email = await this.getUserEmail();
      await this.sb.from('actividad').insert({
        proyecto_id:   proyectoId,
        tipo,
        descripcion,
        metadata,
        usuario_email: email,
      });
    } catch { /* silencioso — la actividad no es critica */ }
  }

  async loadAll() {
    this.loading.set(true);
    const { data, error } = await this.sb
      .from('proyectos')
      .select('*, clientes(nombre, empresa, email, telefono)')
      .eq('archivado', false)
      .order('created_at', { ascending: false });
    this.loading.set(false);
    if (error) throw error;
    this.proyectos.set(data ?? []);
  }

  async loadConArchivados() {
    this.loading.set(true);
    const { data, error } = await this.sb
      .from('proyectos')
      .select('*, clientes(nombre, empresa, email, telefono)')
      .order('created_at', { ascending: false });
    this.loading.set(false);
    if (error) throw error;
    this.proyectos.set(data ?? []);
  }

  async loadByToken(token: string) {
    const { data, error } = await this.sb
      .from('proyectos')
      .select('*, clientes(nombre, empresa, email, telefono)')
      .eq('token_publico', token)
      .single();
    if (error) throw error;
    return data;
  }

  async create(body: Partial<Proyecto>) {
    const { data, error } = await this.sb
      .from('proyectos')
      .insert({ ...body, archivado: false })
      .select('*, clientes(nombre, empresa, email, telefono)')
      .single();
    if (error) throw error;
    this.proyectos.update(list => [data, ...list]);
    // Registrar actividad
    await this.logActividad(data.id, 'proyecto_creado', 'Proyecto creado', { nombre: data.nombre });
    return data;
  }

  async update(id: string, body: Partial<Proyecto>) {
    const { data, error } = await this.sb
      .from('proyectos')
      .update(body)
      .eq('id', id)
      .select('*, clientes(nombre, empresa, email, telefono)')
      .single();
    if (error) throw error;
    this.proyectos.update(list => list.map(p => p.id === id ? data : p));
    return data;
  }

  async updateEstado(id: string, estado: EstadoProyecto) {
    const anterior = this.proyectos().find(p => p.id === id)?.estado;
    const data = await this.update(id, { estado });
    await this.logActividad(id, 'estado_cambio',
      `Estado cambiado a ${ESTADO_LABEL[estado]}`,
      { estado_anterior: anterior, estado_nuevo: estado }
    );
    return data;
  }

  async archivar(id: string) {
    const nombre = this.proyectos().find(p => p.id === id)?.nombre ?? '';
    const { error } = await this.sb.from('proyectos').update({ archivado: true }).eq('id', id);
    if (error) throw error;
    this.proyectos.update(list => list.filter(p => p.id !== id));
    await this.logActividad(id, 'nota', `Proyecto "${nombre}" archivado`);
  }

  async desarchivar(id: string) {
    await this.update(id, { archivado: false });
    this.proyectos.update(list => list.filter(p => p.id !== id));
    await this.logActividad(id, 'nota', 'Proyecto desarchivado');
  }

  async deletePermanente(id: string) {
    const { error } = await this.sb.from('proyectos').delete().eq('id', id);
    if (error) throw error;
    this.proyectos.update(list => list.filter(p => p.id !== id));
  }
}
