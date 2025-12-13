const API_BASE_URL = "https://api.barovainventura.sk/api"

export interface Product {
  id: number
  name: string
  ean: string
  quantity_on_stock: number
  unit: string
  scan_id?: number
}

export interface InventoryItem {
  id: number
  name: string
  ean: string
  quantity: number
  unit: string
  scannedAt?: string
}

export interface MissingProduct {
  name: string
  ean: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      }

      const url = `${API_BASE_URL}${endpoint}`
      console.log(`[API] Fetching: ${url}`)
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        console.warn(`[API] Error ${response.status} from ${url}`)
        return { success: false, error: `Error ${response.status}: ${response.statusText}` }
      }

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error(`[API] Failed to parse JSON from ${url}:`, text.substring(0, 200))
        return { success: false, error: "Server returned invalid response from " + endpoint }
      }

      return { success: true, data }
    } catch (error) {
      console.error("API Request Error:", error)
      return { success: false, error: "Chyba: " + (error instanceof Error ? error.message : String(error)) }
    }
  }

  async login(user_id: string, password_hash: string) {
    return this.request<{
      token: string
      token_type: string
      token_expire: number
      inv_id: string
      multiple_products: boolean
      user_name: string
      news_message: string
      news_color: string
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ user_id, password: password_hash }),
    })
  }

  async getProduct(ean: string) {
    const response = await this.request<{ product_found: Product }>("/product/get-by-ean", {
      method: "POST",
      body: JSON.stringify({ ean }),
    })

    if (response.success && response.data?.product_found) {
      return { success: true, data: { ...response.data.product_found, ean } }
    }

    return { success: false, error: response.error || "Produkt sa nenašiel" }
  }

  async saveProductQuantity(product: Product, quantity: number) {
    const body = {
      scan_id: product.scan_id || 0,
      ean: product.ean,
      full_pack: quantity,
      weight: 0,
      type: 1
    }

    return this.request<{ success: boolean; update_product: string; scan_id: string }>("/product/update", {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  async getMissingProducts() {
    return this.request<{ missing_products: MissingProduct[]; total: number }>("/product/get-missing-products")
  }
}

export const api = new ApiClient()
