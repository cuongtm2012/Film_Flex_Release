import { UserRole, Permissions, PermissionModule } from '../shared/schema.js';

/**
 * Role-based access control utilities
 */
export class RoleManager {
  // Default role permissions mapping
  private static readonly ROLE_PERMISSIONS: Record<string, string[]> = {
    [UserRole.ADMIN]: Object.values(Permissions),
    [UserRole.CONTENT_MANAGER]: [
      Permissions.CONTENT_CREATE,
      Permissions.CONTENT_READ,
      Permissions.CONTENT_UPDATE,
      Permissions.CONTENT_DELETE,
      Permissions.CONTENT_APPROVE,
      Permissions.CONTENT_REJECT,
      Permissions.CONTENT_MODERATE,
      Permissions.USER_READ,
      Permissions.USER_VIEW_ACTIVITY,
      Permissions.CONTENT_VIEW,
      Permissions.CONTENT_SEARCH,
      Permissions.CONTENT_WATCHLIST,
      Permissions.CONTENT_COMMENT,
      Permissions.CONTENT_RATE,
      Permissions.SYSTEM_ANALYTICS,
    ],
    [UserRole.VIEWER]: [
      Permissions.CONTENT_VIEW,
      Permissions.CONTENT_SEARCH,
      Permissions.CONTENT_WATCHLIST,
      Permissions.CONTENT_COMMENT,
      Permissions.CONTENT_RATE,
    ],
  };

  /**
   * Check if a user role has a specific permission
   */
  static hasPermission(userRole: string, permission: string): boolean {
    const rolePermissions = this.ROLE_PERMISSIONS[userRole];
    return rolePermissions?.includes(permission) || false;
  }

  /**
   * Check if a user role has any of the specified permissions
   */
  static hasAnyPermission(userRole: string, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Check if a user role has all of the specified permissions
   */
  static hasAllPermissions(userRole: string, permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(userRole: string): string[] {
    return this.ROLE_PERMISSIONS[userRole] || [];
  }

  /**
   * Check if a role is valid
   */
  static isValidRole(role: string): boolean {
    return Object.values(UserRole).includes(role as any);
  }

  /**
   * Get role hierarchy (higher number = more permissions)
   */
  static getRoleLevel(role: string): number {
    switch (role) {
      case UserRole.ADMIN:
        return 3;
      case UserRole.CONTENT_MANAGER:
        return 2;
      case UserRole.VIEWER:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Check if one role has higher or equal privileges than another
   */
  static hasHigherOrEqualPrivileges(userRole: string, requiredRole: string): boolean {
    return this.getRoleLevel(userRole) >= this.getRoleLevel(requiredRole);
  }

  /**
   * Get available roles for assignment (user can only assign roles at or below their level)
   */
  static getAssignableRoles(userRole: string): string[] {
    const userLevel = this.getRoleLevel(userRole);
    return Object.values(UserRole).filter(role => 
      this.getRoleLevel(role) <= userLevel
    );
  }
}

/**
 * Middleware decorator for checking permissions
 */
export function requirePermission(permission: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const user = this.user || args[0]?.user;
      if (!user || !RoleManager.hasPermission(user.role, permission)) {
        throw new Error(`Access denied. Required permission: ${permission}`);
      }
      return method.apply(this, args);
    };
  };
}

/**
 * Middleware decorator for checking role level
 */
export function requireRole(role: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const user = this.user || args[0]?.user;
      if (!user || !RoleManager.hasHigherOrEqualPrivileges(user.role, role)) {
        throw new Error(`Access denied. Required role level: ${role} or higher`);
      }
      return method.apply(this, args);
    };
  };
}