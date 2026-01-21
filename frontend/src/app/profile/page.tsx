"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { authApi } from "@/api/routers/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, User as UserIcon, Mail, Shield, Calendar, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: ""
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            setFormData(prev => ({ ...prev, email: user.email }));
        }
    }, [user, authLoading, router]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password && formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const updateData: any = {};
            if (formData.email !== user?.email) updateData.email = formData.email;
            if (formData.password) updateData.password = formData.password;

            if (Object.keys(updateData).length === 0) {
                toast.info("No changes to update");
                return;
            }

            await authApi.updateProfile(updateData);
            toast.success("Profile updated successfully");
            setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
            // Ideally we should reload user context here, but skipping for now as email update isn't reactive in context immediately without reload
            // A full app reload or context refresh method would be better
            window.location.reload();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !user) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container py-10 max-w-4xl mx-auto">
            <div className="mb-4">
                <Link href="/">
                    <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary hover:cursor-pointer">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Store
                    </Button>
                </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>My Profile</CardTitle>
                        <CardDescription>View your account details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src="/avatars/01.png" />
                                <AvatarFallback className="text-2xl">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                                <h3 className="text-xl font-bold">{user.username}</h3>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
                                    {user.role}
                                </Badge>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 text-sm">
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Username:</span>
                                <span>{user.username}</span>
                            </div>
                            <div className="flex items-center space-x-3 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Email:</span>
                                <span>{user.email}</span>
                            </div>
                            <div className="flex items-center space-x-3 text-sm">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Role:</span>
                                <span className="capitalize">{user.role}</span>
                            </div>
                            <div className="flex items-center space-x-3 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Joined:</span>
                                <span>{new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Update Profile Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Update Details</CardTitle>
                        <CardDescription>Change your email or password</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleUpdate}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Leave blank to keep current"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="mt-4" type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
