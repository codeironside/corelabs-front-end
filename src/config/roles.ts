export const STUDIO_ROLES = ['editor', 'admin', 'super_admin', 'user'] as const;

export type StudioRole = (typeof STUDIO_ROLES)[number];

/** Roles that can open the Content Studio workspace. */
export const STUDIO_WORKSPACE_ROLES = new Set<StudioRole>(['editor', 'admin', 'super_admin']);

/** Public signup choices — stored server-side as member/editor. */
export const SIGNUP_ROLE_OPTIONS = [
  { value: 'user' as const, label: 'users', studioRole: 'member' as const },
  { value: 'editor' as const, label: 'editor', studioRole: 'editor' as const },
] as const;

export type SignupRoleOption = (typeof SIGNUP_ROLE_OPTIONS)[number]['value'];

/** Normalize server roles (`member`/`viewer`) into Studio role names. */
export function normalizeStudioRole(role: string): StudioRole {
  if (role === 'member' || role === 'viewer' || role === 'users') {
    return 'user';
  }
  if (role === 'editor' || role === 'admin' || role === 'super_admin' || role === 'user') {
    return role;
  }
  return 'user';
}

export function canAccessStudioWorkspace(role: string): boolean {
  return STUDIO_WORKSPACE_ROLES.has(normalizeStudioRole(role));
}
