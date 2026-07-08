import type { AuthState } from "./types";
import { loggedOutState } from "./mock";

/**
 * Auth provider（预留）。第一版永远返回未登录。
 *
 * TODO(未来接真实服务)：
 * - 优先 Supabase Auth（邮箱魔法链接）或 GitHub OAuth；
 * - 仅站长本人可进入 /admin（owner 角色）；
 * - 访客登录只用于评论 / 点赞（visitor 角色）；
 * - 会话放 httpOnly cookie，切勿把密钥写死在前端。
 */

export function getAuthState(): AuthState {
  return loggedOutState;
}

export async function signInWithGitHub(): Promise<void> {
  // TODO: 触发 GitHub OAuth 流程
  throw new Error("Auth 尚未接入：第一版为预留占位。");
}

export async function signInWithSupabase(_email: string): Promise<void> {
  // TODO: Supabase magic link
  throw new Error("Auth 尚未接入：第一版为预留占位。");
}

export async function signOut(): Promise<void> {
  // TODO: 清除会话
}

export function isOwner(): boolean {
  return getAuthState().user?.role === "owner";
}
