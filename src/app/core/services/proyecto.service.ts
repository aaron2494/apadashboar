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
      .select('*, clientes(nombre, empresa, email, telefono)')
      .eq('archivado', false)           // solo no archivados por defecto
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
    return this.update(id, { estado });
  }

  // Archivar: oculta el proyecto de la lista principal, NO borra datos
  async archivar(id: string) {
    const { error } = await this.sb
      .from('proyectos')
      .update({ archivado: true })
      .eq('id', id);
    if (error) throw error;
    this.proyectos.update(list => list.filter(p => p.id !== id));
  }

  // Desarchivar: vuelve a ser visible
  async desarchivar(id: string) {
    await this.update(id, { archivado: false });
    this.proyectos.update(list => list.filter(p => p.id !== id));
  }

  // Borrar permanentemente — solo para proyectos archivados
  async deletePermanente(id: string) {
    const { error } = await this.sb.from('proyectos').delete().eq('id', id);
    if (error) throw error;
    this.proyectos.update(list => list.filter(p => p.id !== id));
  }
}
