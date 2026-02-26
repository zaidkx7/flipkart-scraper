"use client";

import React, { useState, useEffect, useRef } from 'react';
import { scraperApi } from '@/api/routers/scraper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, Terminal, Play, AlertTriangle, Database, Hash, FileText, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface LogMessage {
    time: string;
    level: string;
    text: string;
}

export default function ScraperPage() {
    const [query, setQuery] = useState('');
    const [pages, setPages] = useState<number[]>([1]);
    const [isScraping, setIsScraping] = useState(false);
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Live Stats
    const [stats, setStats] = useState({
        total_scraped: 0,
        duplicates: 0,
        errors: 0,
        pages_processed: 0
    });

    const getWsUrl = () => {
        // Determine the base URL dynamically or use env variable
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
        // Convert http/https to ws/wss
        const wsUrl = baseUrl.replace(/^http/, 'ws');
        return `${wsUrl}/api/scraper/ws`;
    };

    useEffect(() => {
        // Initialize WebSocket connection
        const socket = new WebSocket(getWsUrl());

        socket.onopen = () => {
            console.log('WebSocket connection established');
            setWs(socket);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'log':
                        setLogs(prev => [...prev, {
                            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }),
                            level: data.level,
                            text: data.message
                        }]);
                        break;

                    case 'stats':
                        setStats(data.data);
                        break;

                    case 'status':
                        setIsScraping(data.status === 'running');
                        break;
                }
            } catch (e) {
                console.error('Error parsing websocket message', e);
            }
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
            setWs(null);
        };

        return () => {
            socket.close();
        };
    }, []);

    // Auto-scroll logs to bottom
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleStartScraper = async () => {
        if (!query.trim()) {
            toast.error('Please enter a search query');
            return;
        }

        setLogs([{
            time: new Date().toLocaleTimeString(),
            level: 'info',
            text: `Connecting to backend and triggering scrape job for "${query}" (${pages[0]} pages)...`
        }]);

        // Reset stats for new run
        setStats({
            total_scraped: 0,
            duplicates: 0,
            errors: 0,
            pages_processed: 0
        });

        try {
            await scraperApi.startScraper(query, pages[0]);
        } catch (error: any) {
            toast.error('Failed to start scraper', {
                description: error.response?.data?.detail || error.message || 'An unexpected error occurred',
            });
            setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                level: 'error',
                text: `Failed to trigger backend process: ${error.message}`
            }]);
        }
    };

    const handleStopScraper = async () => {
        try {
            await scraperApi.stopScraper();
            toast.success("Stop requested sent to scraper engine.");
            setLogs(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                level: 'warning',
                text: `Sending abort sequence to active extraction process...`
            }]);
        } catch (error: any) {
            toast.error("Failed to stop scraper", {
                description: error.response?.data?.detail || error.message || 'An unexpected error occurred',
            });
        }
    }

    const clearLogs = () => {
        setLogs([]);
    };

    const getLogColor = (level: string) => {
        switch (level) {
            case 'error': return 'text-red-400';
            case 'warning': return 'text-yellow-400';
            case 'success': return 'text-green-400';
            default: return 'text-gray-300';
        }
    };

    return (
        <div className="container py-10 max-w-6xl mx-auto">
            <div className="mb-4">
                <Link href="/">
                    <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary hover:cursor-pointer">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Store
                    </Button>
                </Link>
            </div>

            <Card className="mb-6">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            Scraper Module
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Configure and monitor background extraction processes.</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm border rounded-md px-4 py-2 bg-background">
                        <div className={`w-2 h-2 rounded-full ${ws ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        {ws ? 'WS Connected' : 'WS Disconnected'}
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Config & Stats */}
                <div className="lg:col-span-4 flex flex-col gap-6">

                    {/* Controls Panel */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Play className="w-4 h-4" />
                                Controls
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Search Query</Label>
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="e.g. Laptops..."
                                        disabled={isScraping}
                                    />
                                </div>

                                <div className="pt-2 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label>Page Depth</Label>
                                        <span className="text-sm font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                                            {pages[0]}
                                        </span>
                                    </div>
                                    <Slider
                                        value={pages}
                                        onValueChange={setPages}
                                        max={20}
                                        min={1}
                                        step={1}
                                        disabled={isScraping}
                                    />
                                </div>

                                <div className="pt-4 mt-4 border-t flex flex-col gap-2">
                                    <Button
                                        onClick={handleStartScraper}
                                        disabled={isScraping || !ws}
                                        className="w-full"
                                        variant={isScraping ? "secondary" : "default"}
                                    >
                                        {isScraping ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Executing...
                                            </>
                                        ) : (
                                            <>
                                                Run Scraper
                                                <Terminal className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>

                                    {isScraping && (
                                        <Button
                                            onClick={handleStopScraper}
                                            variant="destructive"
                                            className="w-full"
                                        >
                                            Stop Process
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Live Analytics Panel */}
                    <Card className="flex-1">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Statistics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border rounded-md p-3 flex flex-col items-center justify-center text-center bg-card">
                                    <Database className="w-5 h-5 text-green-500 mb-2" />
                                    <span className="text-2xl font-bold">{stats.total_scraped || 0}</span>
                                    <span className="text-xs text-muted-foreground mt-1">Products</span>
                                </div>

                                <div className="border rounded-md p-3 flex flex-col items-center justify-center text-center bg-card">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500 mb-2" />
                                    <span className="text-2xl font-bold">{stats.duplicates || 0}</span>
                                    <span className="text-xs text-muted-foreground mt-1">Duplicates</span>
                                </div>

                                <div className="border rounded-md p-3 flex flex-col items-center justify-center text-center bg-card">
                                    <FileText className="w-5 h-5 text-blue-500 mb-2" />
                                    <span className="text-2xl font-bold">{stats.pages_processed || 0}</span>
                                    <span className="text-xs text-muted-foreground mt-1">Pages</span>
                                </div>

                                <div className="border rounded-md p-3 flex flex-col items-center justify-center text-center bg-card">
                                    <Hash className="w-5 h-5 text-red-500 mb-2" />
                                    <span className="text-2xl font-bold">{stats.errors || 0}</span>
                                    <span className="text-xs text-muted-foreground mt-1">Errors</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column: Terminal Window */}
                <div className="lg:col-span-8 flex flex-col h-[500px] lg:h-[670px]">
                    <Card className="flex flex-col flex-1 overflow-hidden">
                        {/* Terminal Header */}
                        <div className="bg-muted px-4 py-2 border-b flex justify-between items-center shrink-0">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">root@engine:~/flipkart</span>
                            <button
                                onClick={clearLogs}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Clear
                            </button>
                        </div>

                        {/* Terminal Output Body */}
                        <div className="p-4 overflow-y-auto flex-1 bg-[#1e1e1e] text-neutral-200 font-mono custom-scrollbar">
                            {logs.length === 0 ? (
                                <div className="text-neutral-500 flex flex-col items-center justify-center h-full gap-3">
                                    <Terminal className="w-12 h-12 opacity-20" />
                                    <div className="text-sm">Awaiting remote command execution...</div>
                                </div>
                            ) : (
                                <div className="space-y-1.5 text-[13px] leading-relaxed">
                                    {logs.map((log, index) => (
                                        <div key={index} className="flex gap-4 break-all animate-in fade-in duration-300">
                                            <span className="text-neutral-500 shrink-0">[{log.time}]</span>
                                            <span className={`${getLogColor(log.level)}`}>{log.text}</span>
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            )}

                            {/* Blinking Cursor */}
                            {isScraping && (
                                <div className="flex gap-4 mt-2">
                                    <span className="text-neutral-500">[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" })}]</span>
                                    <span className="w-2 h-4 bg-gray-400 animate-pulse ml-1 inline-block"></span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
