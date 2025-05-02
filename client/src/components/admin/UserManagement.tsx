import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Search, 
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  UserPlus,
  Users,
  ShieldCheck,
  ShieldAlert,
  Check,
  X
} from "lucide-react";

// Mock data for development
const mockUsers = [
  {
    id: 1,
    username: "admin",
    email: "admin@filmflex.com",
    role: "admin",
    status: "active",
    lastLogin: "2025-05-01 10:30 AM",
  },
  {
    id: 2,
    username: "moderator",
    email: "mod@filmflex.com",
    role: "moderator",
    status: "active",
    lastLogin: "2025-05-01 09:15 AM",
  },
  {
    id: 3,
    username: "user1",
    email: "user1@example.com",
    role: "user",
    status: "active",
    lastLogin: "2025-04-30 03:45 PM",
  },
  {
    id: 4,
    username: "user2",
    email: "user2@example.com",
    role: "user",
    status: "inactive",
    lastLogin: "2025-04-25 11:20 AM",
  },
  {
    id: 5,
    username: "creator",
    email: "creator@studio.com",
    role: "content_creator",
    status: "active",
    lastLogin: "2025-05-01 08:00 AM",
  },
];

const mockRoles = [
  { id: 1, name: "admin", description: "Full system access" },
  { id: 2, name: "moderator", description: "Content moderation access" },
  { id: 3, name: "user", description: "Standard user access" },
  { id: 4, name: "content_creator", description: "Content creation privileges" },
  { id: 5, name: "content_reviewer", description: "Content review privileges" },
];

const mockPermissions = [
  { id: 1, name: "user:create", description: "Create users" },
  { id: 2, name: "user:read", description: "View users" },
  { id: 3, name: "user:update", description: "Update users" },
  { id: 4, name: "user:delete", description: "Delete users" },
  { id: 5, name: "content:create", description: "Create content" },
  { id: 6, name: "content:read", description: "View content" },
  { id: 7, name: "content:update", description: "Update content" },
  { id: 8, name: "content:delete", description: "Delete content" },
  { id: 9, name: "role:manage", description: "Manage roles and permissions" },
  { id: 10, name: "setting:manage", description: "Manage platform settings" },
];

type Role = {
  id: number;
  name: string;
  description: string;
};

type Permission = {
  id: number;
  name: string;
  description: string;
};

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
};

export default function UserManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);

  // In a real implementation, this would use the TanStack Query hook to fetch users
  // const { data, isLoading, error } = useQuery({ 
  //   queryKey: ['/api/users', currentPage, statusFilter, roleFilter, searchQuery], 
  //   queryFn: () => fetch(`/api/users?page=${currentPage}&status=${statusFilter}&role=${roleFilter}&search=${searchQuery}`).then(res => res.json())
  // });

  // For now, we'll use the mock data
  const filteredUsers = mockUsers.filter(user => {
    // Apply status filter
    if (statusFilter !== "all" && user.status !== statusFilter) {
      return false;
    }
    
    // Apply role filter
    if (roleFilter !== "all" && user.role !== roleFilter) {
      return false;
    }
    
    // Apply search query
    if (searchQuery && !user.username.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !user.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const handleSelectUser = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSelectAllUsers = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setIsEditUserOpen(true);
  };

  const handleViewUser = (user: User) => {
    toast({
      title: "User Details",
      description: `Viewing details for ${user.username}`,
    });
  };

  const handleEditRole = (role: Role) => {
    setCurrentRole(role);
    setIsEditRoleOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* User Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={roleFilter} 
                onValueChange={setRoleFilter}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="content_creator">Creator</SelectItem>
                  <SelectItem value="content_reviewer">Reviewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setRoleFilter("all");
              }}>
                <Filter className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  New User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account with role and permissions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Username</label>
                    <Input placeholder="Enter username" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" placeholder="Enter email" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input type="password" placeholder="Enter password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm Password</label>
                    <Input type="password" placeholder="Confirm password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select defaultValue="user">
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockRoles.map(role => (
                          <SelectItem key={role.id} value={role.name}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                  <Button onClick={() => {
                    toast({
                      title: "User Created",
                      description: "New user has been created successfully",
                    });
                    setIsAddUserOpen(false);
                  }}>Create User</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-2 text-left">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAllUsers}
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    />
                  </th>
                  <th className="py-3 px-2 text-left font-medium">ID</th>
                  <th className="py-3 px-2 text-left font-medium">Username</th>
                  <th className="py-3 px-2 text-left font-medium">Email</th>
                  <th className="py-3 px-2 text-left font-medium">Role</th>
                  <th className="py-3 px-2 text-left font-medium">Status</th>
                  <th className="py-3 px-2 text-left font-medium">Last Login</th>
                  <th className="py-3 px-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-4 px-2">
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                      />
                    </td>
                    <td className="py-4 px-2">{user.id}</td>
                    <td className="py-4 px-2">{user.username}</td>
                    <td className="py-4 px-2">{user.email}</td>
                    <td className="py-4 px-2">
                      <Badge variant={
                        user.role === "admin" ? "default" : 
                        user.role === "moderator" ? "secondary" : 
                        user.role === "content_creator" ? "success" :
                        user.role === "content_reviewer" ? "warning" :
                        "outline"
                      }>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-4 px-2">
                      <Badge variant={user.status === "active" ? "success" : "destructive"}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-2">{user.lastLogin}</td>
                    <td className="py-4 px-2">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {mockUsers.length} users
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={true} // In a real app, this would be disabled when on the last page
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role and Permission Management */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Role Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </div>
              <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                    <DialogDescription>
                      Define a new role with specific permissions
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role Name</label>
                      <Input placeholder="Enter role name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Input placeholder="Enter role description" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Permissions</label>
                      <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                        {mockPermissions.map(permission => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <input type="checkbox" id={`perm-${permission.id}`} />
                            <label htmlFor={`perm-${permission.id}`} className="text-sm">
                              {permission.name} - {permission.description}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddRoleOpen(false)}>Cancel</Button>
                    <Button onClick={() => {
                      toast({
                        title: "Role Created",
                        description: "New role has been created successfully",
                      });
                      setIsAddRoleOpen(false);
                    }}>Create Role</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRoles.map(role => (
                <div key={role.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <div className="font-medium">{role.name}</div>
                    <div className="text-sm text-muted-foreground">{role.description}</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditRole(role)}
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permission Sets */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Sets</CardTitle>
            <CardDescription>Configure permission templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-md">
                <div>
                  <div className="font-medium">Content Manager</div>
                  <div className="text-sm text-muted-foreground">Manage all content</div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-md">
                <div>
                  <div className="font-medium">User Manager</div>
                  <div className="text-sm text-muted-foreground">Manage user accounts</div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-md">
                <div>
                  <div className="font-medium">System Administrator</div>
                  <div className="text-sm text-muted-foreground">Full system access</div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>Perform actions on multiple users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Select Action</label>
                <Select defaultValue="activate">
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activate">Activate Users</SelectItem>
                    <SelectItem value="deactivate">Deactivate Users</SelectItem>
                    <SelectItem value="role">Change Role</SelectItem>
                    <SelectItem value="delete">Delete Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                disabled={selectedUsers.length === 0}
                onClick={() => {
                  toast({
                    title: "Bulk Action Applied",
                    description: `Applied action to ${selectedUsers.length} users`,
                  });
                  setSelectedUsers([]);
                }}
              >
                Apply to Selected ({selectedUsers.length})
              </Button>
              <Separator />
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Export Users</label>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {currentUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input defaultValue={currentUser.username} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" defaultValue={currentUser.email} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select defaultValue={currentUser.role}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockRoles.map(role => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select defaultValue={currentUser.status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reset Password</label>
                <Button variant="outline" className="w-full">Send Password Reset Email</Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              toast({
                title: "User Updated",
                description: `User ${currentUser?.username} has been updated successfully`,
              });
              setIsEditUserOpen(false);
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role information and permissions
            </DialogDescription>
          </DialogHeader>
          {currentRole && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Name</label>
                <Input defaultValue={currentRole.name} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input defaultValue={currentRole.description} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Permissions</label>
                <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                  {mockPermissions.map(permission => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`edit-perm-${permission.id}`} 
                        // In a real app, this would be checked based on role permissions
                        defaultChecked={permission.id % 2 === 0} 
                      />
                      <label htmlFor={`edit-perm-${permission.id}`} className="text-sm">
                        {permission.name} - {permission.description}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRoleOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              toast({
                title: "Role Updated",
                description: `Role ${currentRole?.name} has been updated successfully`,
              });
              setIsEditRoleOpen(false);
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}