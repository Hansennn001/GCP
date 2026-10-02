const TOKEN_KEY = 'sales-insight-token'

export function readToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}
export function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
}
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}
