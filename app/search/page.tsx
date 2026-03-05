"use client";

import Link from "next/link";
import { TrendingUp, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CourseSearch from "@/components/dashboard/CourseSearch";

export default function SearchPage() {
    return (
        <div className="flex min-h-screen flex-col bg-muted/20">
            <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-6 shadow-sm justify-between">
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

            <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
                <CourseSearch />
            </main>
        </div>
    );
}
