-- Migration: Setup Default RBAC Roles and Permissions
-- This migration creates the three default roles: Admin, Content Manager, Viewer
-- and assigns appropriate permissions to each role

-- Insert default permissions if they don't exist
INSERT OR IGNORE INTO permissions (name, description, module) VALUES
-- User Management Permissions
('user.create', 'Create new users', 'user_management'),
('user.read', 'View user information', 'user_management'),
('user.update', 'Update user information', 'user_management'),
('user.delete', 'Delete users', 'user_management'),
('user.manage_roles', 'Assign and manage user roles', 'user_management'),
('user.view_activity', 'View user activity logs', 'user_management'),

-- Content Management Permissions
('content.create', 'Create new content', 'content_management'),
('content.read', 'View content details', 'content_management'),
('content.update', 'Update existing content', 'content_management'),
('content.delete', 'Delete content', 'content_management'),
('content.approve', 'Approve pending content', 'content_management'),
('content.reject', 'Reject pending content', 'content_management'),
('content.moderate', 'Moderate user-generated content', 'content_management'),

-- System Administration Permissions
('system.admin', 'Full system administration access', 'system'),
('system.analytics', 'View system analytics and reports', 'system'),
('system.settings', 'Modify system settings', 'system'),
('system.api_keys', 'Manage API keys', 'system'),
('system.audit_logs', 'View audit logs', 'system'),

-- Role Management Permissions
('role.create', 'Create new roles', 'role_management'),
('role.read', 'View role information', 'role_management'),
('role.update', 'Update role information', 'role_management'),
('role.delete', 'Delete roles', 'role_management'),
('role.assign_permissions', 'Assign permissions to roles', 'role_management'),

-- Viewing Permissions
('content.view', 'View content', 'viewing'),
('content.search', 'Search for content', 'viewing'),
('content.watchlist', 'Manage personal watchlist', 'viewing'),
('content.comment', 'Comment on content', 'viewing'),
('content.rate', 'Rate content', 'viewing');

-- Insert default roles if they don't exist
INSERT OR IGNORE INTO roles (name, description) VALUES
('Admin', 'Full administrative access to all system features'),
('Content Manager', 'Manage content and moderate user-generated content'),
('Viewer', 'Standard user with viewing and basic interaction capabilities');

-- Assign permissions to Admin role (all permissions)
INSERT OR IGNORE INTO rolePermissions (roleId, permissionId)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin';

-- Assign permissions to Content Manager role
INSERT OR IGNORE INTO rolePermissions (roleId, permissionId)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Content Manager'
AND p.name IN (
    -- Content management permissions
    'content.create', 'content.read', 'content.update', 'content.delete',
    'content.approve', 'content.reject', 'content.moderate',
    -- Basic user viewing
    'user.read', 'user.view_activity',
    -- Viewing permissions
    'content.view', 'content.search', 'content.watchlist', 'content.comment', 'content.rate',
    -- Basic system access
    'system.analytics'
);

-- Assign permissions to Viewer role (basic viewing permissions)
INSERT OR IGNORE INTO rolePermissions (roleId, permissionId)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Viewer'
AND p.name IN (
    'content.view', 'content.search', 'content.watchlist', 'content.comment', 'content.rate'
);

-- Update existing users with default roles if they don't have roles assigned
-- Set first admin user to Admin role
UPDATE users SET role = 'Admin' 
WHERE id = (SELECT MIN(id) FROM users WHERE role IS NULL OR role = '') 
AND EXISTS (SELECT 1 FROM users WHERE role IS NULL OR role = '');

-- Set remaining users without roles to Viewer role
UPDATE users SET role = 'Viewer' 
WHERE role IS NULL OR role = '';

-- Create audit log entry for this migration
INSERT INTO auditLogs (userId, action, tableName, recordId, changes, timestamp)
VALUES (
    1, -- System user
    'SYSTEM_MIGRATION',
    'roles_permissions',
    0,
    'Created default RBAC roles: Admin, Content Manager, Viewer with appropriate permissions',
    datetime('now')
);