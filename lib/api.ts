// API client pre barovainventura.sk
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
  weight: number // vždy 0
  type?: 0 | 1
}

export interface ApiError {
  status: "error"
  message: string
}

// SHA256 hash funkcia
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// API funkcie
export async function login(userId: string, password: string): Promise<LoginResponse> {
  const hashedPassword = await sha256(password)

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      password: hashedPassword,
    }),
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.message || "Prihlásenie zlyhalo")
  }

  return response.json()
}

export async function logout(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.message || "Odhlásenie zlyhalo")
  }
}

export async function refreshToken(token: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error("Token refresh zlyhal")
  }

  const data = await response.json()
  return data.authorisation.token
}

export async function getProductByEan(token: string, ean: string): Promise<ProductSearchResult> {
  const response = await fetch(`${API_BASE_URL}/product/get-by-ean`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ ean }),
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.message || "Vyhľadávanie produktu zlyhalo")
  }

  return response.json()
}

export async function getMissingProducts(token: string): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/product/get-missing-products`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.message || "Načítanie chýbajúcich produktov zlyhalo")
  }

  return response.json()
}

export async function updateProduct(
  token: string,
  data: Omit<UpdateProductData, "weight">,
): Promise<{ scan_id: string }> {
  const response = await fetch(`${API_BASE_URL}/product/update`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...data,
      weight: 0, // vždy 0
    }),
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.message || "Aktualizácia produktu zlyhala")
  }

  return response.json()
}
