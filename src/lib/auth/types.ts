/**
 * 认证类型（预留）。第一版永远未登录。
 */

export type UserRole = "owner" | "visitor";

export interface AuthUser {
  id: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
}

export interface AuthState {
  status: "authenticated" | "unauthenticated" | "loading";
  user: AuthUser | null;
}

export type AuthProviderName = "supabase" | "github";
