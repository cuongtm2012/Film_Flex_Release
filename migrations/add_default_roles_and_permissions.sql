-- Migration: Add Default Roles and Permissions for RBAC System
-- Date: 2025-05-25
-- Description: Creates three default roles (Admin, Content Manager, Viewer) with comprehensive permissions

-- First, insert core permissions for the application
INSERT INTO permissions (name, description, module, action) VALUES 
-- User Management Permissions
('user.create', 'Create new users', 'user_management', 'create'),
('user.read', 'View user information', 'user_management', 'read'),
('user.update', 'Update user information', 'user_management', 'update'),
('user.delete', 'Delete users', 'user_management', 'delete'),
('user.manage_roles', 'Assign and modify user roles', 'user_management', 'manage_roles'),
('user.view_activity', 'View user activity logs', 'user_management', 'view_activity'),

-- Content Management Permissions
('content.create', 'Add new movies and content', 'content_management', 'create'),
('content.read', 'View content details', 'content_management', 'read'),
('content.update', 'Edit existing content', 'content_management', 'update'),
('content.delete', 'Remove content', 'content_management', 'delete'),
('content.approve', 'Approve pending content', 'content_management', 'approve'),
('content.reject', 'Reject submitted content', 'content_management', 'reject'),
('content.moderate', 'Moderate user comments and reviews', 'content_management', 'moderate'),

-- System Administration Permissions
('system.admin', 'Full system administration access', 'system', 'admin'),
('system.analytics', 'View analytics and reports', 'system', 'analytics'),
('system.settings', 'Modify system settings', 'system', 'settings'),
('system.api_keys', 'Manage API keys', 'system', 'api_keys'),
('system.audit_logs', 'View audit logs', 'system', 'audit_logs'),

-- Role Management Permissions
('role.create', 'Create new roles', 'role_management', 'create'),
('role.read', 'View role information', 'role_management', 'read'),
('role.update', 'Modify existing roles', 'role_management', 'update'),
('role.delete', 'Delete roles', 'role_management', 'delete'),
('role.assign_permissions', 'Assign permissions to roles', 'role_management', 'assign_permissions'),

-- Viewing Permissions
('content.view', 'View movies and content', 'viewing', 'view'),
('content.search', 'Search for content', 'viewing', 'search'),
('content.watchlist', 'Manage personal watchlist', 'viewing', 'watchlist'),
('content.comment', 'Comment on content', 'viewing', 'comment'),
('content.rate', 'Rate movies and content', 'viewing', 'rate')

ON CONFLICT (name) DO NOTHING;

-- Insert the three default roles
INSERT INTO roles (name, description) VALUES 
('Admin', 'Full administrative access to all system functions'),
('Content Manager', 'Manages content creation, editing, and moderation'),
('Viewer', 'Standard user with viewing and basic interaction capabilities')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to Admin role (full access)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin';

-- Assign permissions to Content Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Content Manager'
AND p.name IN (
    'content.create',
    'content.read', 
    'content.update',
    'content.delete',
    'content.approve',
    'content.reject',
    'content.moderate',
    'content.view',
    'content.search',
    'user.read',
    'user.view_activity',
    'system.analytics'
);

-- Assign permissions to Viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Viewer'
AND p.name IN (
    'content.view',
    'content.search',
    'content.watchlist',
    'content.comment',
    'content.rate',
    'content.read'
);

-- Update existing users to use new role system if needed
-- Map existing UserRole enum values to new role names
UPDATE users SET role = 'Admin' WHERE role = 'admin';
UPDATE users SET role = 'Content Manager' WHERE role = 'moderator';
UPDATE users SET role = 'Viewer' WHERE role = 'normal';
UPDATE users SET role = 'Viewer' WHERE role = 'premium'; -- Premium users become viewers with potential upgrade path

-- Create an index on role_permissions for better performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Insert audit log entry for this migration
INSERT INTO audit_logs (user_id, activity_type, details, ip_address)
VALUES (1, 'SYSTEM_MIGRATION', '{"migration": "add_default_roles_and_permissions", "action": "Created default RBAC roles and permissions"}', '127.0.0.1');