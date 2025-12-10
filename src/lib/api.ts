const API_BASE_URL = "https://api.barovainventura.sk/api"

// Typy pre API
export interface LoginResponse {
  token: string
  token_type: string
  token_expire: number
  inv_id: string
  multiple_products: boolean
  user_name: string
  news_message?: string
  news_color?: string
}

export interface Product {
  name: string
  brand: string
  selling_method: "kusovy" | "kusove" | "rozlievane"
  packaging_type: "kusovy" | "kusove" | "rozlievane"
  quantity_on_stock: string
  alcohol_content?: string
  open_weight?: string
  scan_id?: string
  volume?: string
  ean?: string
}

export interface ProductSearchResult {
  product_found?: Product | Product[]
  product_not_found?: { create_option: string }
}

export interface UpdateProductData {
  scan_id?: string
  ean: string
  full_pack: string
  weight: number
  type?: 0 | 1
}

export interface ApiError {
  status: "error"
  message: string
}

// SHA256 hash funkcia pre React Native
async function sha256(message: string): Promise<string> {
  // React Native nemá crypto.subtle, použijeme js-sha256 alebo manuálnu implementáciu
  // Pre jednoduchosť použijeme fetch na hash endpoint alebo knižnicu
  // Toto je jednoduchá implementácia pomocou js hashovania
  const encoder = new TextEncoder()
  const data = encoder.encode(message)

  // V React Native použijeme expo-crypto
  const Crypto = require("expo-crypto")
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, message)
  return hash
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  getToken(): string | null {
    return this.token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...((options.headers as Record<string, string>) || {}),
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }))
      throw new Error(error.message || "Request failed")
    }

    return response.json()
  }

  async login(userId: string, password: string): Promise<LoginResponse> {
    const hashedPassword = await sha256(password)

    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        password: hashedPassword,
      }),
    })
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", { method: "POST" })
  }

  async getProductByEan(ean: string): Promise<ProductSearchResult> {
    return this.request("/product/get-by-ean", {
      method: "POST",
      body: JSON.stringify({ ean }),
    })
  }

  async getMissingProducts(): Promise<Product[]> {
    return this.request("/product/get-missing-products", {
      method: "GET",
    })
  }

  async updateProduct(data: Omit<UpdateProductData, "weight">): Promise<{ scan_id: string }> {
    return this.request("/product/update", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        weight: 0,
      }),
    })
  }
}

export const api = new ApiClient()
