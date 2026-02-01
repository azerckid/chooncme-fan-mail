import Link from "next/link";
import {
    LayoutDashboard,
    Mail,
    Star,
    Settings,
    PieChart,
    LogOut,
    Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const navItems = [
    { name: "대시보드", href: "/dashboard", icon: LayoutDashboard },
    { name: "팬레터 목록", href: "/dashboard/letters", icon: Mail },
    { name: "즐겨찾기", href: "/dashboard/letters?isStarred=true", icon: Star },
    { name: "분석 통계", href: "/dashboard/stats", icon: PieChart },
];

export function Sidebar() {
    return (
        <div className="flex flex-col w-64 border-r bg-neutral-50/50 min-h-screen">
            <div className="p-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-neutral-900 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="font-bold text-xl tracking-tight">춘심AI 아카이브</span>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "w-full justify-start gap-3 px-3 py-6 text-base font-medium transition-colors hover:bg-neutral-200/50"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-neutral-200/60">
                <button
                    className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "w-full justify-start gap-3 px-3 py-6 text-base text-neutral-500 hover:text-red-600 hover:bg-red-50"
                    )}
                >
                    <LogOut className="w-5 h-5" />
                    로그아웃
                </button>
            </div>
        </div>
    );
}
