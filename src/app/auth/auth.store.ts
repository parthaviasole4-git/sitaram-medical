import { Injectable, signal, computed } from '@angular/core';

export interface UserProfile {
  email: string;
  name: string;
  mobile: string;
  location: string;
  token?: string;
  expiration?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: UserProfile & { accessToken?: string; refreshToken?: string; token?: string };
  errors?: string[];
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  role: 'customer' | 'admin';
}

export const STORAGE_KEY = 'radheshyam-medical.auth';

function readState(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { user: null, token: null, isAuthenticated: false, role: 'customer' };
    }
    return JSON.parse(raw);
  } catch {
    return { user: null, token: null, isAuthenticated: false, role: 'customer' };
  }
}

function writeState(state: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding JWT', e);
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  readonly state = signal<AuthState>(readState());

  readonly user = computed(() => this.state().user);
  readonly isAuthenticated = computed(() => this.state().isAuthenticated);
  readonly token = computed(() => this.state().token);
  readonly role = computed(() => this.state().role);

  readonly userId = computed(() => {
    const token = this.state().token;
    if (!token) return null;
    const decoded = decodeJwt(token);
    return decoded?.sub || decoded?.id || decoded?.UserId || decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || null;
  });

  updateState(data: any) {
    const token = data.token || data.accessToken;
    // Handle case where data might be just partial updates or full user object
    // If it's from login/register, it usually has the token.
    // If it's from profile update, it might not have token, so we preserve existing token if needed.
    
    const existingToken = this.state().token;
    const finalToken = token || existingToken;

    let role: 'customer' | 'admin' = 'customer';
    
    if (finalToken) {
        const decoded = decodeJwt(finalToken);
        if (decoded) {
            const roleClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded['role'] || decoded['roles'];
            
            if (roleClaim) {
                if (Array.isArray(roleClaim)) {
                    if (roleClaim.includes('Admin') || roleClaim.includes('admin')) {
                        role = 'admin';
                    }
                } else if (typeof roleClaim === 'string') {
                    if (roleClaim.toLowerCase() === 'admin') {
                        role = 'admin';
                    }
                }
            }
        }
    }

    const user: UserProfile = {
      email: data.email,
      name: data.name,
      mobile: data.mobile,
      location: data.location,
      token: finalToken
    };

    if (user.email && user.email.toLowerCase() === 'radheshyam.ongc.colony@gmail.com') {
      role = 'admin';
    }

    const next: AuthState = {
      user,
      token: finalToken,
      isAuthenticated: true, // Assuming if we have data we are authenticated
      role: role
    };
    
    this.state.set(next);
    writeState(next);
  }
  
  updateUser(partialUser: Partial<UserProfile>) {
      const currentState = this.state();
      if (!currentState.user) return;

      const updatedUser = { ...currentState.user, ...partialUser };
      const next: AuthState = {
          ...currentState,
          user: updatedUser
      };
      this.state.set(next);
      writeState(next);
  }

  logout() {
    const next: AuthState = {
      user: null,
      token: null,
      isAuthenticated: false,
      role: 'customer'
    };
    this.state.set(next);
    writeState(next);
    localStorage.removeItem(STORAGE_KEY);
  }
}
