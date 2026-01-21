"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, RefreshCw, ChevronLeft } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { authApi, User } from "@/api/routers/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

export default function UsersPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    // ... existing hooks ... 
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // New User Form State
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        role: "user"
    });

    useEffect(() => {
        if (!authLoading) {
            if (!currentUser || currentUser.role !== 'admin') {
                toast.error("Unauthorized access");
                router.push('/');
                return;
            }
            loadUsers();
        }
    }, [currentUser, authLoading, router]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await authApi.getAllUsers();
            setUsers(data);
        } catch (error) {
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await authApi.createUser(formData);
            toast.success("User created successfully");
            setDialogOpen(false);
            setFormData({ username: "", email: "", password: "", role: "user" }); // Reset form
            loadUsers(); // Refresh list
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to create user");
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || (currentUser?.role !== 'admin')) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container py-10 max-w-5xl mx-auto">
            <div className="mb-4">
                <Link href="/">
                    <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary hover:cursor-pointer">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Store
                    </Button>
                </Link>
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>User Management</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add User
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New User</DialogTitle>
                                    <DialogDescription>
                                        Add a new user to the system. They will receive the specified role.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateUser}>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="username">Username</Label>
                                            <Input
                                                id="username"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="role">Role</Label>
                                            <Select
                                                value={formData.role}
                                                onValueChange={(value) => setFormData({ ...formData, role: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">User</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={submitting}>
                                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Create User
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.id}</TableCell>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.is_active ? 'outline' : 'destructive'} className={user.is_active ? "text-green-600 border-green-600" : ""}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
