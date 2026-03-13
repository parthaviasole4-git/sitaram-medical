import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.verified()) return router.parseUrl(auth.role() === 'admin' ? '/admin/dashboard' : '/app/home');
  return true;
};

export const otpGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.verified()) return router.parseUrl(auth.role() === 'admin' ? '/admin/dashboard' : '/app/home');
  if (!auth.phone()) return router.parseUrl('/login');
  return true;
};

export const appGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Allow all verified users (including admins) to access /app routes,
  // so checkout and post-order pages work even if the token has admin role.
  if (auth.verified()) return true;
  if (auth.phone()) return router.parseUrl('/otp');
  return router.parseUrl('/login');
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.verified() && auth.role() === 'admin') return true;
  if (auth.verified()) return router.parseUrl('/app/home');
  if (auth.phone()) return router.parseUrl('/otp');
  return router.parseUrl('/login');
};
