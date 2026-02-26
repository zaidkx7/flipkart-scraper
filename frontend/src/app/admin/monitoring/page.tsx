"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Activity, HardDrive, Cpu, MemoryStick, Database, ShieldAlert, ArrowUpCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { systemApi, SystemMetricsResponse } from "@/api/routers/system";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
    time: string;
    cpu: number;
    mem: number;
}

export default function MonitoringPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [metrics, setMetrics] = useState<SystemMetricsResponse | null>(null);
    const [history, setHistory] = useState<ChartData[]>([]);

    useEffect(() => {
        if (!authLoading) {
            if (!currentUser || currentUser.role !== 'admin') {
                toast.error("Unauthorized access");
                router.push('/');
                return;
            }
        }
    }, [currentUser, authLoading, router]);

    useEffect(() => {
        if (currentUser?.role !== 'admin') return;

        const fetchMetrics = async () => {
            try {
                const data = await systemApi.getMetrics();
                setMetrics(data);

                // Update chart history
                const now = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setHistory(prev => {
                    const newHistory = [...prev, {
                        time: now,
                        cpu: data.hardware.cpu_usage,
                        mem: data.hardware.memory_usage
                    }];
                    // Keep last 20 data points
                    return newHistory.slice(-20);
                });

            } catch (error) {
                console.error("Failed to fetch system metrics", error);
            }
        };

        // Initial fetch
        fetchMetrics();

        // Setup polling every 3 seconds
        const interval = setInterval(fetchMetrics, 3000);
        return () => clearInterval(interval);
    }, [currentUser]);

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}h ${m}m ${s}s`;
    };

    if (authLoading || (currentUser?.role !== 'admin')) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container py-10 max-w-6xl mx-auto space-y-6">
            <div className="mb-4">
                <Link href="/">
                    <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary hover:cursor-pointer">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Store
                    </Button>
                </Link>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
                    <p className="text-muted-foreground">Real-time server metrics, hardware load, and database capacities.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">Server Online</span>
                    </div>
                    {metrics && (
                        <div className="text-sm text-muted-foreground">
                            Uptime: <span className="font-mono text-primary">{formatUptime(metrics.uptime)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Core Load</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.hardware.cpu_usage || 0}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {metrics?.hardware.cpu_cores || 0} Logical Cores
                        </p>
                        <Progress value={metrics?.hardware.cpu_usage || 0} className="mt-3" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Memory Allocation</CardTitle>
                        <MemoryStick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.hardware.memory_usage || 0}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {metrics?.hardware.memory_used_gb || 0} GB / {metrics?.hardware.memory_total_gb || 0} GB Utilized
                        </p>
                        <Progress value={metrics?.hardware.memory_usage || 0} className="mt-3" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Storage Capacity</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.hardware.disk_usage || 0}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {metrics?.hardware.disk_free_gb || 0} GB Free of {metrics?.hardware.disk_total_gb || 0} GB
                        </p>
                        <Progress value={metrics?.hardware.disk_usage || 0} className="mt-3" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Database Store</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.database.total_products.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total Records Indexed
                        </p>
                        <div className="mt-3 flex items-center text-xs text-green-500 font-medium">
                            <ArrowUpCircle className="mr-1 h-3 w-3" />
                            Connection Stable
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1 md:col-span-2">
                    <CardHeader>
                        <CardTitle>System Performance Metrics</CardTitle>
                        <CardDescription>Live CPU and Memory utilization graph rendering over a 60-second polling window.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <XAxis
                                        dataKey="time"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}%`}
                                        domain={[0, 100]}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="cpu"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        name="CPU Usage"
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="mem"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        name="Memory Usage"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
