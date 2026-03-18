export type EstadoProyecto = 'EN_PROGRESO' | 'PAUSADO' | 'COMPLETADO' | 'CANCELADO';
export type TipoEntregable = 'figma' | 'drive' | 'notion' | 'github' | 'link';
export type CategoriaHora  = 'diseno' | 'desarrollo' | 'redes' | 'ads' | 'reunion' | 'otro';

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

export interface ItemPresupuesto {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
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
  token_publico?: string;
  items_presupuesto?: ItemPresupuesto[];
  archivado: boolean;
  created_at: string;
  clientes?: Pick<Cliente, 'nombre' | 'empresa' | 'email' | 'telefono'>;
}

export interface Pago {
  id: string;
  proyecto_id: string;
  monto: number;
  fecha: string;
  nota?: string;
  created_at: string;
}

export interface Entregable {
  id: string;
  proyecto_id: string;
  nombre: string;
  url: string;
  tipo: TipoEntregable;
  created_at: string;
}

export interface Hora {
  id: string;
  proyecto_id: string;
  categoria: CategoriaHora;
  cantidad: number;
  descripcion?: string;
  fecha: string;
  created_at: string;
}

export interface VistaPublicaProyecto {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoProyecto;
  presupuesto: number;
  monto_cobrado: number;
  fecha_inicio: string;
  fecha_entrega?: string;
  clientes?: Pick<Cliente, 'nombre' | 'empresa'>;
  pagos?: Pick<Pago, 'monto' | 'fecha' | 'nota'>[];
  entregables?: Pick<Entregable, 'nombre' | 'url' | 'tipo'>[];
}


export type TipoActividad =
  | 'proyecto_creado'
  | 'estado_cambio'
  | 'pago_registrado'
  | 'pago_eliminado'
  | 'entregable_agregado'
  | 'entregable_eliminado'
  | 'hora_registrada'
  | 'nota';

export interface Actividad {
  id: string;
  proyecto_id: string;
  tipo: TipoActividad;
  descripcion: string;
  metadata?: Record<string, any>;
  usuario_email?: string;
  created_at: string;
}

export interface DashboardStats {
  ingresosMes: number;
  ingresosTotal: number;
  proyectosActivos: number;
  cobrosPendientes: number;
  porcentajeCobrado: number;
}

// Para notificaciones de cobros vencidos
export interface AlertaCobro {
  proyectoId: string;
  proyectoNombre: string;
  clienteEmpresa: string;
  pendiente: number;
  diasDesdeUltimoPago: number;
}
