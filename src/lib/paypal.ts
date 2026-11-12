import "server-only";
import { randomUUID } from 'node:crypto';

export interface PaypalClient {
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  authorizeOrder(orderId: string): Promise<AuthorizationDetails>;
  getAuthorization(authId: string): Promise<AuthorizationDetails>;
  captureAuthorization(authId: string, params: CaptureParams): Promise<CaptureResult>;
  voidAuthorization(authId: string): Promise<VoidResult>;
  refundCapture(captureId: string, params: RefundParams): Promise<RefundResult>;
  reauthorizeAuthorization(authId: string, amountMinor: number): Promise<ReauthorizeResult>;
}

export interface CreateOrderParams {
  orderId: number;
  totalMinor: number;
  currency: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
  customId: string;
}

export interface CreateOrderResult {
  orderId: string;
  approveUrl: string;
  status: string;
}

export interface AuthorizationDetails {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
  create_time: string;
  expiration_time: string;
  links: Array<{ rel: string; href: string }>;
}

export interface CaptureParams {
  amountMinor: number;
  currency: string;
  finalCapture: boolean;
  invoiceId: string;
  requestId: string;
}

export interface CaptureResult {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
  final_capture: boolean;
  links: Array<{ rel: string; href: string }>;
}

export interface VoidResult {
  status: string;
}

export interface RefundParams {
  amountMinor: number;
  currency: string;
  requestId: string;
  invoiceId: string;
}

export interface RefundResult {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
}

export interface ReauthorizeResult {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
  create_time: string;
  expiration_time: string;
}

class RealPaypalClient implements PaypalClient {
  private token: { access_token: string; expires_at: number } | null = null;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    this.baseUrl = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
    this.clientId = process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    if (!this.clientId || !this.clientSecret) {
      throw new Error('PayPal credentials not configured');
    }
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expires_at > Date.now() + 60000) {
      return this.token.access_token;
    }
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to get PayPal token: ${res.status} ${text}`);
    }
    const data = await res.json();
    this.token = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    return this.token.access_token;
  }

  private async request<T>(path: string, options: RequestInit, idempotencyKey?: string): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (idempotencyKey) {
      headers['PayPal-Request-Id'] = idempotencyKey;
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      signal: options.signal || AbortSignal.timeout(10000),
      headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PayPal API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const merchantEmail = process.env.PAYPAL_MERCHANT_EMAIL?.trim();
    const body = {
      intent: 'AUTHORIZE',
      purchase_units: [{
        ...(merchantEmail ? { payee: { email_address: merchantEmail } } : {}),
        amount: { currency_code: params.currency, value: (params.totalMinor / 100).toFixed(2) },
        ...(params.description ? { description: params.description.slice(0, 127) } : {}),
        custom_id: params.customId,
      }],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        brand_name: 'Kisaan Kavach',
      },
    };
    const data = await this.request<{ id: string; status: string; links: Array<{ rel: string; href: string }> }>(
      '/v2/checkout/orders',
      { method: 'POST', body: JSON.stringify(body) },
      randomUUID()
    );
    const approveLink = data.links.find(l => l.rel === 'approve');
    return {
      orderId: data.id,
      approveUrl: approveLink?.href || '',
      status: data.status,
    };
  }

  async getAuthorization(authId: string): Promise<AuthorizationDetails> {
    return this.request<AuthorizationDetails>(`/v2/payments/authorizations/${authId}`, { method: 'GET' });
  }

  async authorizeOrder(orderId: string): Promise<AuthorizationDetails> {
    const data = await this.request<{ purchase_units?: Array<{ payments?: { authorizations?: Array<{ id: string }> } }> }>(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`,
      { method: 'POST', body: JSON.stringify({}) },
      `paypal-order:${orderId}:authorize`
    );
    const authorizationId = data.purchase_units?.[0]?.payments?.authorizations?.[0]?.id;
    if (!authorizationId) throw new Error('PayPal did not return a payment confirmation.');
    return this.getAuthorization(authorizationId);
  }

  async captureAuthorization(authId: string, params: CaptureParams): Promise<CaptureResult> {
    const body = {
      amount: { currency_code: params.currency, value: (params.amountMinor / 100).toFixed(2) },
      final_capture: params.finalCapture,
      invoice_id: params.invoiceId,
    };
    return this.request<CaptureResult>(
      `/v2/payments/authorizations/${authId}/capture`,
      { method: 'POST', body: JSON.stringify(body) },
      params.requestId
    );
  }

  async voidAuthorization(authId: string): Promise<VoidResult> {
    return this.request<VoidResult>(`/v2/payments/authorizations/${authId}/void`, { method: 'POST' });
  }

  async refundCapture(captureId: string, params: RefundParams): Promise<RefundResult> {
    const body = {
      amount: { currency_code: params.currency, value: (params.amountMinor / 100).toFixed(2) },
      invoice_id: params.invoiceId,
    };
    return this.request<RefundResult>(
      `/v2/payments/captures/${captureId}/refund`,
      { method: 'POST', body: JSON.stringify(body) },
      params.requestId
    );
  }

  async reauthorizeAuthorization(authId: string, amountMinor: number): Promise<ReauthorizeResult> {
    const body = { amount: { currency_code: 'USD', value: (amountMinor / 100).toFixed(2) } };
    return this.request<ReauthorizeResult>(
      `/v2/payments/authorizations/${authId}/reauthorize`,
      { method: 'POST', body: JSON.stringify(body) },
      `order:reauth:${authId}`
    );
  }
}

class MockPaypalClient implements PaypalClient {
  private auths = new Map<string, AuthorizationDetails>();
  private captures = new Map<string, CaptureResult>();
  private refunds = new Map<string, RefundResult>();

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const authId = `MOCK_AUTH_${params.orderId}_${Date.now()}`;
    this.auths.set(authId, {
      id: authId,
      status: 'CREATED',
      amount: { value: (params.totalMinor / 100).toFixed(2), currency_code: params.currency },
      create_time: new Date().toISOString(),
      expiration_time: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
      links: [],
    });
    return {
      orderId: `MOCK_ORDER_${params.orderId}`,
      approveUrl: `/mock/approve?orderId=${params.orderId}&authId=${authId}`,
      status: 'CREATED',
    };
  }

  async getAuthorization(authId: string): Promise<AuthorizationDetails> {
    const auth = this.auths.get(authId);
    if (!auth) throw new Error('Authorization not found');
    return auth;
  }

  async authorizeOrder(orderId: string): Promise<AuthorizationDetails> {
    const orderNumber = orderId.replace('MOCK_ORDER_', '');
    const authId = [...this.auths.keys()].find((id) => id.startsWith(`MOCK_AUTH_${orderNumber}_`));
    if (!authId) throw new Error('Demo payment not found. Please start again.');
    const authorization = this.auths.get(authId);
    if (!authorization) throw new Error('Demo payment not found. Please start again.');
    authorization.status = 'AUTHORIZED';
    return authorization;
  }

  async captureAuthorization(authId: string, params: CaptureParams): Promise<CaptureResult> {
    const captureId = `MOCK_CAP_${authId}_${params.amountMinor}`;
    const result: CaptureResult = {
      id: captureId,
      status: 'COMPLETED',
      amount: { value: (params.amountMinor / 100).toFixed(2), currency_code: params.currency },
      final_capture: params.finalCapture,
      links: [],
    };
    this.captures.set(captureId, result);
    const auth = this.auths.get(authId);
    if (auth) {
      this.auths.set(authId, { ...auth, status: params.finalCapture ? 'CAPTURED' : 'PARTIALLY_CAPTURED' });
    }
    return result;
  }

  async voidAuthorization(authId: string): Promise<VoidResult> {
    const auth = this.auths.get(authId);
    if (auth) {
      this.auths.set(authId, { ...auth, status: 'VOIDED' });
    }
    return { status: 'VOIDED' };
  }

  async refundCapture(captureId: string, params: RefundParams): Promise<RefundResult> {
    const refundId = `MOCK_REF_${captureId}_${params.amountMinor}`;
    const result: RefundResult = {
      id: refundId,
      status: 'COMPLETED',
      amount: { value: (params.amountMinor / 100).toFixed(2), currency_code: params.currency },
    };
    this.refunds.set(refundId, result);
    return result;
  }

  async reauthorizeAuthorization(authId: string, amountMinor: number): Promise<ReauthorizeResult> {
    const newAuthId = `${authId}_REAUTH_${Date.now()}`;
    const result: ReauthorizeResult = {
      id: newAuthId,
      status: 'CREATED',
      amount: { value: (amountMinor / 100).toFixed(2), currency_code: 'USD' },
      create_time: new Date().toISOString(),
      expiration_time: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    };
    this.auths.set(newAuthId, {
      id: newAuthId,
      status: 'CREATED',
      amount: { value: (amountMinor / 100).toFixed(2), currency_code: 'USD' },
      create_time: new Date().toISOString(),
      expiration_time: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
      links: [],
    });
    return result;
  }
}

let clientInstance: PaypalClient | null = null;

export function getPaypalClient(): PaypalClient {
  if (clientInstance) return clientInstance;
  const useMockPayments = process.env.PAYPAL_DEMO_MODE === 'true'
    || (process.env.PAYPAL_DEMO_MODE !== 'false' && process.env.DEMO_MODE === 'true');
  if (useMockPayments) {
    clientInstance = new MockPaypalClient();
  } else if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    clientInstance = new RealPaypalClient();
  } else {
    throw new Error('PayPal Sandbox is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Render, or set PAYPAL_DEMO_MODE=true for simulated payments.');
  }
  return clientInstance;
}

export function resetPaypalClient() {
  clientInstance = null;
}
