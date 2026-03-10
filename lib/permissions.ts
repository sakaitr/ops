export type UserRole = "personel" | "yetkili" | "yonetici" | "admin";

const ROLE_ORDER: Record<UserRole, number> = {
  personel: 0,
  yetkili: 1,
  yonetici: 2,
  admin: 3,
};

export function isAtLeast(userRole: UserRole, requiredRole: UserRole) {
  return ROLE_ORDER[userRole] >= ROLE_ORDER[requiredRole];
}

export function canManageConfigs(userRole: UserRole) {
  return isAtLeast(userRole, "yonetici");
}

export function canManageUsers(userRole: UserRole) {
  return userRole === "admin";
}

export function canViewTicket(
  user: { id: string; role: UserRole },
  ticket: { assigned_to: string | null; created_by: string }
) {
  if (isAtLeast(user.role, "yetkili")) {
    return true;
  }
  return ticket.assigned_to === user.id || ticket.created_by === user.id;
}

export function canViewTodo(
  user: { id: string; role: UserRole },
  todo: { assigned_to: string | null; created_by: string }
) {
  if (isAtLeast(user.role, "yonetici")) {
    return true;
  }
  return todo.assigned_to === user.id || todo.created_by === user.id;
}

export function canViewWorklog(
  user: { id: string; role: UserRole },
  worklog: { user_id: string }
) {
  if (isAtLeast(user.role, "yonetici")) {
    return true;
  }
  return worklog.user_id === user.id;
}

export function canReviewWorklog(userRole: UserRole) {
  return isAtLeast(userRole, "yonetici");
}
