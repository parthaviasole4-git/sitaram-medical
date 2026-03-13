import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, map, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AuthStore, AuthResponse, UserProfile } from './auth.store';
import { environment } from '../../environments/environment';

const API_BASE_URL = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);

  // Expose signals from store for backward compatibility and usage
  readonly user = this.store.user;
  readonly isAuthenticated = this.store.isAuthenticated;
  readonly token = this.store.token;
  readonly role = this.store.role;
  
  // Backward compatibility for components using 'profile'
  readonly profile = computed(() => ({
    fullName: this.store.user()?.name || '',
    email: this.store.user()?.email || '',
    address: this.store.user()?.location || ''
  }));

  // Backward compatibility for components using 'phone'
  readonly phone = computed(() => this.store.user()?.mobile || null);
  
  // Backward compatibility for components using 'verified'
  readonly verified = computed(() => this.store.isAuthenticated());

  readonly userId = this.store.userId;

  register(payload: any): Observable<AuthResponse> {
    return this.http.post<any>(`${API_BASE_URL}/bff/auth/register`, payload).pipe(
      map(res => {
        // API may return { ok: true } or a standard { success: true }
        if (res && (res.ok === true || res.success === true)) {
          return { success: true, message: 'Registered' } as AuthResponse;
        }
        return { success: false, message: res?.message || 'Registration failed' } as AuthResponse;
      })
    );
  }

  login(payload: any): Observable<any> {
    const normalize = (r: any) => {
      const resp: any = r || {};
      const data = resp.data || resp;
      const token = data.token || data.accessToken || resp.token || null;
      const user = data.user || {
        email: data.email,
        name: data.name,
        mobile: data.mobile,
        location: data.location,
        photo: data.photo
      };
      if (token && (user?.email || user?.name || user?.mobile || user?.location)) {
        return { success: true, message: resp.message || 'Login successful', data: { ...user, token } };
      }
      if (resp.success && resp.data) return resp;
      return { success: false, message: resp.message || 'Invalid credentials' };
    };
    return this.http.post<any>(`${API_BASE_URL}/bff/auth/login`, payload).pipe(
      map(normalize),
      tap(response => {
        if (response.success && response.data) {
          this.store.updateState(response.data);
        }
      })
    );
  }

  forgotPassword(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/auth/forgot-password`, { email });
  }

  resetPassword(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/auth/reset-password`, payload);
  }

  private decodeBase64Url(input: string): string {
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : '';
    return atob(b64 + pad);
  }

  private emailFromToken(t?: string | null): string | null {
    if (!t) return null;
    const parts = t.split('.');
    if (parts.length < 2) return null;
    try {
      const payload = JSON.parse(this.decodeBase64Url(parts[1]));
      return payload.email || payload.preferred_username || payload.upn || payload.sub || null;
    } catch {
      return null;
    }
  }

  getProfile(): Observable<AuthResponse> {
    const tokenEmail = this.emailFromToken(this.store.token());
    const stateEmail = this.store.user()?.email;
    const emailParam = tokenEmail || stateEmail || null;
    const url = emailParam ? `${API_BASE_URL}/bff/user/profile/${encodeURIComponent(emailParam)}` : `${API_BASE_URL}/bff/user/profile`;
    return this.http.get<any>(url).pipe(
      map(resp => {
        const data = resp?.data || resp;
        if (data && (data.email || data.name || data.mobile || data.location)) {
          return { success: true, data } as AuthResponse;
        }
        return resp as AuthResponse;
      }),
      tap(response => {
        if (response.success && response.data) {
          this.store.updateState({ ...this.store.state().user, ...response.data });
        }
      })
    );
  }

  logout() {
    this.store.logout();
  }
  
  // Compatibility method
  startLogin(phone: string, role: 'customer' | 'admin') {
      console.warn('startLogin is deprecated. Use login() instead.');
  }

  // Compatibility method
  updateProfile(profile: any) {
    const currentUser = this.store.user();
    if (currentUser) {
       const updatedUser = {
         ...currentUser,
         name: profile.fullName || currentUser.name,
         email: profile.email || currentUser.email,
         location: profile.address || currentUser.location
       };
       this.store.updateState(updatedUser);
    }
  }

  // Compatibility method
  verifyOtp() {
      console.warn('verifyOtp is deprecated.');
  }
}
