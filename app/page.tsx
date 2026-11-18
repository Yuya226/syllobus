"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, BookOpenCheck, GraduationCap, Lock, Search, TrendingUp, Upload } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-background/85 backdrop-blur-md h-14">
                <div className="w-full mx-auto px-4 md:px-12 lg:px-20 flex h-full items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity">
                        <TrendingUp className="h-6 w-6" />
                        <span>Syllobus</span>
                    </Link>
                    <nav className="flex gap-4">
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/about">運営について</Link>
                        </Button>
                    </nav>
                </div>
            </header>
            <main className="flex-1">
                <section className="w-full mx-auto px-4 md:px-12 lg:px-20 pt-10 pb-8 md:pt-16 md:pb-10">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-5"
                        >
                            <p className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                                成績提供で集計データにアクセス
                            </p>
                            <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl md:text-6xl leading-[1.05]">
                                阪大の履修判断を、
                                <span className="text-primary">成績データ</span>
                                から始める。
                            </h1>
                            <p className="max-w-2xl text-base text-muted-foreground md:text-lg leading-relaxed">
                                KOANの単位修得状況CSVから、大学の分類に基づく修得単位・学期別推移・卒業要件の進捗を確認できます。成績の共有は任意です。
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button asChild size="lg" className="text-base">
                                    <Link href="/dashboard">
                                        <Upload className="mr-2 h-4 w-4" />
                                        成績をアップロード
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="text-base">
                                    <Link href="/dashboard?demo=1">
                                        <Search className="mr-2 h-4 w-4" />
                                        サンプルデータで試す
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="outline"><Link href="/search">科目を探す</Link></Button>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.15 }}
                            className="rounded-md border bg-card p-4 shadow-sm"
                        >
                            <div className="mb-3 flex items-center justify-between border-b pb-3">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground">GPA偏差値</p>
                                    <p className="text-4xl font-black text-primary">62.4</p>
                                </div>
                                <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                    参加者集計
                                </div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    ['線形代数学', 'S+A 68%', 'bg-emerald-500'],
                                    ['解析学入門', 'S+A 51%', 'bg-blue-500'],
                                    ['有機化学', '不可 18%', 'bg-rose-500'],
                                ].map(([name, value, color]) => (
                                    <div key={name} className="grid grid-cols-[1fr_72px] items-center gap-3 text-sm">
                                        <span className="truncate font-medium">{name}</span>
                                        <span className="text-right text-xs font-semibold text-muted-foreground">{value}</span>
                                        <div className="col-span-2 h-1.5 rounded-full bg-secondary">
                                            <div className={`h-full rounded-full ${color}`} style={{ width: value.includes('68') ? '68%' : value.includes('51') ? '51%' : '18%' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                <section className="w-full mx-auto px-4 md:px-12 lg:px-20 pb-10 lg:pb-14">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-md border bg-card p-5 shadow-sm">
                            <BarChart3 className="mb-3 h-5 w-5 text-primary" />
                            <h3 className="text-sm font-bold">GPAと評価分布</h3>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                取込明細の参考GPAと評価数を確認できます。共有比較は十分なデータがある科目だけ表示します。
                            </p>
                        </div>
                        <div className="rounded-md border bg-card p-5 shadow-sm">
                            <BookOpenCheck className="mb-3 h-5 w-5 text-amber-600" />
                            <h3 className="text-sm font-bold">成績分布で科目選び</h3>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                S/A/B/C/F の投稿分布から、履修前の不確実さを減らします。
                            </p>
                        </div>
                        <div className="rounded-md border bg-card p-5 shadow-sm">
                            <GraduationCap className="mb-3 h-5 w-5 text-emerald-600" />
                            <h3 className="text-sm font-bold">卒業要件チェック</h3>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                修得単位を学部要件ごとに分類し、足りない領域を見える化します。
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <footer className="border-t py-4 md:py-0">
                <div className="w-full mx-auto px-4 md:px-12 lg:px-20 flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
                    <p className="text-center text-xs leading-loose text-muted-foreground md:text-left">
                        阪大生による非公式サービス
                    </p>
                </div>
            </footer>
        </div>
    );
}
