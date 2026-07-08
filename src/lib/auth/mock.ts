import type { AuthState, AuthUser } from "./types";

/**
 * Auth mock。第一版仅提供「未登录」状态；站长示例用户仅用于类型演示。
 */

export const mockOwner: AuthUser = {
  id: "owner_0",
  name: "Traveler",
  role: "owner",
};

export const loggedOutState: AuthState = {
  status: "unauthenticated",
  user: null,
};
