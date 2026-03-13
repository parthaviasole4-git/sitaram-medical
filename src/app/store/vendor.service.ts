import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

const API_BASE_URL = environment.apiBaseUrl;
const EXTERNAL_API_BASE_URL = environment.externalApiBaseUrl;

type InitInput = { prescriptionNo: string; phone?: string; fullName?: string; address?: string };
type VerifyInput = { orderId: number; otp: string };
type ResendInput = { PrescriptionNo: string };

@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly vendorFlow = signal<{ orderId: number; prescriptionNo: string } | null>(null);

  private headers(): HttpHeaders | undefined {
    const token = this.auth.token();
    if (token) return new HttpHeaders({ Authorization: `Bearer ${token}` });
    return undefined;
  }

  init(input: InitInput) {
    return this.http.post<any>(`${API_BASE_URL}/vendor/checkout/init`, input, { headers: this.headers() });
  }

  externalVerify(input: { PrescriptionNo: string; otp: string }) {
    return this.http.post<any>(`${EXTERNAL_API_BASE_URL}/api/Otp/verify`, input);
  }

  verify(input: VerifyInput) {
    return this.http.post<any>(`${API_BASE_URL}/vendor/checkout/verify`, input, { headers: this.headers() });
  }

  resend(input: ResendInput) {
    return this.http.post<any>(`${EXTERNAL_API_BASE_URL}/api/Otp/resend`, input);
  }
}
