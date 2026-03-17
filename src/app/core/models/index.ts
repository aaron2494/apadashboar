export type EstadoProyecto = 'EN_PROGRESO' | 'PAUSADO' | 'COMPLETADO' | 'CANCELADO';

export interface Cliente {
  id: string;
  nombre: string;
  empresa: string;
  email?: string;
  telefono?: string;
  notas?: string;
  activo: boolean;
  created_at: string;
}

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion?: string;
  cliente_id: string;
  estado: EstadoProyecto;
  presupuesto: number;
  monto_cobrado: number;
  fecha_inicio: string;
  fecha_entrega?: string;
  created_at: string;
  clientes?: Pick<Cliente, 'nombre' | 'empresa'>;
}

export interface Pago {
  id: string;
  proyecto_id: string;
  monto: number;
  fecha: string;
  nota?: string;
  created_at: string;
  proyectos?: Pick<Proyecto, 'nombre'>;
}

export interface DashboardStats {
  ingresosMes: number;
  ingresosTotal: number;
  proyectosActivos: number;
  cobrosPendientes: number;
  porcentajeCobrado: number;
}
