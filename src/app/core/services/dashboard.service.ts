import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Proyecto, DashboardStats } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private sb = inject(SupabaseService).client;

  readonly proyectos = signal<Proyecto[]>([]);
  readonly loading   = signal(false);

  // computed: stats calculadas automáticamente cuando cambian los proyectos
  readonly stats = computed<DashboardStats>(() => {
    const ps = this.proyectos();
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const ingresosMes = ps
      .filter(p => {
        const d = new Date(p.created_at);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
      })
      .reduce((acc, p) => acc + p.monto_cobrado, 0);

    const ingresosTotal = ps.reduce((acc, p) => acc + p.monto_cobrado, 0);
    const proyectosActivos = ps.filter(p => p.estado === 'EN_PROGRESO').length;
    const cobrosPendientes = ps.reduce(
      (acc, p) => acc + Math.max(0, p.presupuesto - p.monto_cobrado), 0
    );
    const totalPresupuesto = ps.reduce((acc, p) => acc + p.presupuesto, 0);
    const porcentajeCobrado = totalPresupuesto > 0
      ? Math.round((ingresosTotal / totalPresupuesto) * 100)
      : 0;

    return { ingresosMes, ingresosTotal, proyectosActivos, cobrosPendientes, porcentajeCobrado };
  });

  // computed: ingresos agrupados por mes para el gráfico
  readonly ingresosPorMes = computed(() => {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const hoy = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1);
      const total = this.proyectos()
        .filter(p => {
          const pd = new Date(p.created_at);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        })
        .reduce((acc, p) => acc + p.monto_cobrado, 0);
      return { mes: meses[d.getMonth()], total };
    });
  });

  async load() {
    this.loading.set(true);
    const { data, error } = await this.sb
      .from('proyectos')
      .select('*');
    this.loading.set(false);
    if (error) throw error;
    this.proyectos.set(data ?? []);
  }
}
