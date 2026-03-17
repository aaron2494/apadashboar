import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Proyecto, EstadoProyecto } from '../models';

@Injectable({ providedIn: 'root' })
export class ProyectoService {
  private sb = inject(SupabaseService).client;

  readonly proyectos = signal<Proyecto[]>([]);
  readonly loading   = signal(false);

  async loadAll() {
    this.loading.set(true);
    const { data, error } = await this.sb
      .from('proyectos')
      .select('*, clientes(nombre, empresa)')
      .order('created_at', { ascending: false });
    this.loading.set(false);
    if (error) throw error;
    this.proyectos.set(data ?? []);
  }

  async loadByCliente(clienteId: string) {
    this.loading.set(true);
    const { data, error } = await this.sb
      .from('proyectos')
      .select('*, clientes(nombre, empresa)')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });
    this.loading.set(false);
    if (error) throw error;
    this.proyectos.set(data ?? []);
  }

  async create(body: Partial<Proyecto>) {
    const { data, error } = await this.sb
      .from('proyectos')
      .insert(body)
      .select('*, clientes(nombre, empresa)')
      .single();
    if (error) throw error;
    this.proyectos.update(list => [data, ...list]);
    return data;
  }

  async update(id: string, body: Partial<Proyecto>) {
    const { data, error } = await this.sb
      .from('proyectos')
      .update(body)
      .eq('id', id)
      .select('*, clientes(nombre, empresa)')
      .single();
    if (error) throw error;
    this.proyectos.update(list => list.map(p => p.id === id ? data : p));
    return data;
  }

  async updateEstado(id: string, estado: EstadoProyecto) {
    return this.update(id, { estado });
  }

  async delete(id: string) {
    const { error } = await this.sb.from('proyectos').delete().eq('id', id);
    if (error) throw error;
    this.proyectos.update(list => list.filter(p => p.id !== id));
  }
}
