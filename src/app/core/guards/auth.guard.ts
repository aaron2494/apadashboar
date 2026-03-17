import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const sb     = inject(SupabaseService).client;
  const router = inject(Router);
  const { data: { session } } = await sb.auth.getSession();
  if (session) return true;
  router.navigate(['/auth/login']);
  return false;
};
