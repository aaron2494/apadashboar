import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Cliente } from '../models';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private sb = inject(SupabaseService).client;

  readonly clientes = signal<Cliente[]>([]);
  readonly loading  = signal(false);
  readonly error    = signal<string | null>(null);

  async loadAll() {
    this.loading.set(true);
    this.error.set(null);
    const { data, error } = await this.sb
      .from('clientes')
      .select('*')
      .eq('activo', true)
      .order('empresa');
    this.loading.set(false);
    if (error) { this.error.set(error.message); return; }
    this.clientes.set(data ?? []);
  }

  async create(body: Partial<Cliente>) {
    const { data, error } = await this.sb
      .from('clientes')
      .insert(body)
      .select()
      .single();
    if (error) throw error;
    this.clientes.update(list => [...list, data]);
    return data;
  }

  async update(id: string, body: Partial<Cliente>) {
    const { data, error } = await this.sb
      .from('clientes')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    this.clientes.update(list => list.map(c => c.id === id ? data : c));
    return data;
  }

  async delete(id: string) {
    const { error } = await this.sb
      .from('clientes')
      .update({ activo: false })
      .eq('id', id);
    if (error) throw error;
    this.clientes.update(list => list.filter(c => c.id !== id));
  }
}
