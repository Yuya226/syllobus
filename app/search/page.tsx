"use client";

import Link from "next/link";
import { TrendingUp, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CourseSearch from "@/components/dashboard/CourseSearch";

export default function SearchPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/85 px-4 shadow-sm backdrop-blur-md md:px-8 justify-between">
                <Link href="/" className="flex items-center gap-1.5 font-bold text-lg text-primary hover:opacity-80 transition-opacity">
                    <TrendingUp className="h-5 w-5" />
                    Syllobus
                </Link>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link href="/dashboard">
                        <BarChart2 className="h-3.5 w-3.5" />
                        マイ成績・解析
                    </Link>
                </Button>
            </header>

            <main className="flex-1 w-full">
                <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">
                    <div className="mb-5 flex flex-col gap-1">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Course Search</p>
                        <h1 className="text-2xl font-black tracking-tight">楽単検索</h1>
                    </div>
                    <CourseSearch />
                </div>
            </main>
        </div>
    );
}
