/**
 * Mirror of the backend's user-management rule (is-fleet-backend
 * src/common/utils/role-rank.ts): DRIVER < MANAGER < TEAMLEAD < ADMIN. You
 * may edit, deactivate or reactivate only users ranked below you; ADMIN
 * accounts only as ADMIN; never yourself (your own profile is /account).
 * The server enforces it — this only hides actions it would refuse.
 */
const ROLE_RANK: Record<string, number> = {
  DRIVER: 0,
  MANAGER: 1,
  TEAMLEAD: 2,
  ADMIN: 3,
};

export function canManageUser(
  me: { id: string; role: string } | null | undefined,
  target: { id: string; role: string } | null | undefined,
): boolean {
  if (!me || !target || me.id === target.id) return false;
  if (target.role === "ADMIN") return me.role === "ADMIN";
  const mine = ROLE_RANK[me.role];
  const theirs = ROLE_RANK[target.role];
  if (mine === undefined || theirs === undefined) return false;
  return mine > theirs;
}
