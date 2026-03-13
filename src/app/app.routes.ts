import { Routes } from '@angular/router';
import { adminGuard, appGuard, guestGuard, otpGuard } from './auth/auth.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'vendor/otp',
    loadComponent: () => import('./pages/vendor-otp/vendor-otp.page').then(m => m.VendorOtpPage)
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password.page').then(m => m.ResetPasswordPage)
  },
  {
    path: 'otp',
    canActivate: [otpGuard],
    loadComponent: () => import('./pages/otp/otp.page').then(m => m.OtpPage)
  },
  {
    path: 'app',
    canActivate: [appGuard],
    loadComponent: () => import('./pages/app-shell/app-shell.page').then(m => m.AppShellPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products/products.page').then(m => m.ProductsPage)
      },
      {
        path: 'search',
        redirectTo: 'products'
      },
      {
        path: 'cart',
        loadComponent: () => import('./pages/cart/cart.page').then(m => m.CartPage)
      },
      {
        path: 'checkout',
        loadComponent: () => import('./pages/checkout/checkout.page').then(m => m.CheckoutPage)
      },
      {
        path: 'payment-success',
        loadComponent: () => import('./pages/payment-success/payment-success.page').then(m => m.PaymentSuccessPage)
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders/orders.page').then(m => m.OrdersPage)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage)
      },
      {
        path: 'account',
        loadComponent: () => import('./pages/account/account.page').then(m => m.AccountPage)
      },
      {
        path: 'admin-products',
        loadComponent: () => import('./pages/admin-products/admin-products.page').then(m => m.AdminProductsPage)
      }
      ,
      {
        path: 'vendor/otp',
        loadComponent: () => import('./pages/vendor-otp/vendor-otp.page').then(m => m.VendorOtpPage)
      }
    ]
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin-shell/admin-shell.page').then(m => m.AdminShellPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.page').then(m => m.AdminDashboardPage)
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/admin-orders/admin-orders.page').then(m => m.AdminOrdersPage)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin-users/admin-users.page').then(m => m.AdminUsersPage)
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/admin-products/admin-products.page').then(m => m.AdminProductsPage)
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
