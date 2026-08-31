import {
  normalizeStudioRole,
  SIGNUP_ROLE_OPTIONS,
  type SignupRoleOption,
  type StudioRole,
} from '@/config/roles';
import { studioClient } from '@/lib/axios';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthUserProfile {
  userId: string;
  email: string;
  name: string;
  role: StudioRole;
  workspaceId: string;
}

export type GoogleAuthResult =
  | TokenPair
  | { requiresSignupRole: true; signupToken: string };

function isTokenPair(value: GoogleAuthResult): value is TokenPair {
  return 'accessToken' in value && 'refreshToken' in value;
}

export function isSignupRoleRequired(
  value: GoogleAuthResult,
): value is { requiresSignupRole: true; signupToken: string } {
  return 'requiresSignupRole' in value && value.requiresSignupRole === true;
}

/** Exchange a Firebase Google ID token with CoreLabsStudio auth. */
export async function googleStudioLogin(payload: {
  idToken: string;
  intent: 'login' | 'signup';
  signupRole?: SignupRoleOption;
  rememberMe?: boolean;
}): Promise<GoogleAuthResult> {
  const mapped =
    payload.intent === 'signup' && payload.signupRole
      ? SIGNUP_ROLE_OPTIONS.find((option) => option.value === payload.signupRole)
      : undefined;

  const { data } = await studioClient.post<ApiResponse<GoogleAuthResult>>('/auth/google', {
    idToken: payload.idToken,
    intent: payload.intent,
    rememberMe: payload.rememberMe ?? true,
    ...(mapped ? { signupRole: mapped.studioRole } : {}),
  });
  return data.data;
}

export async function completeGoogleSignup(payload: {
  signupToken: string;
  signupRole: SignupRoleOption;
  rememberMe?: boolean;
}): Promise<TokenPair> {
  const mapped = SIGNUP_ROLE_OPTIONS.find((option) => option.value === payload.signupRole);
  const { data } = await studioClient.post<ApiResponse<TokenPair>>('/auth/complete-signup', {
    signupToken: payload.signupToken,
    signupRole: mapped?.studioRole ?? 'member',
    rememberMe: payload.rememberMe ?? true,
  });
  return data.data;
}

export async function fetchMe(): Promise<AuthUserProfile> {
  const { data } = await studioClient.get<
    ApiResponse<{
      userId: string;
      email: string;
      name: string;
      role: string;
      workspaceId: string;
    }>
  >('/users/me');

  const user = data.data;
  return {
    userId: user.userId,
    email: user.email,
    name: user.name || user.email.split('@')[0] || 'creator',
    role: normalizeStudioRole(user.role),
    workspaceId: user.workspaceId,
  };
}

export { isTokenPair };
