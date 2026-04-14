"use client";

import { useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend,
} from "recharts";

interface TrendData {
    date: string | null;
    count: number;
}

interface DistributionData {
    [key: string]: number;
}

interface TrendChartProps {
    data7Days: TrendData[];
    data30Days: TrendData[];
}

export function TrendChart({ data7Days, data30Days }: TrendChartProps) {
    const [period, setPeriod] = useState<"7" | "30">("7");
    const data = period === "7" ? data7Days : data30Days;

    const formattedData = data.map(item => ({
        ...item,
        date: item.date ? item.date.slice(5) : "",
    }));

    return (
        <div>
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setPeriod("7")}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        period === "7"
                            ? "bg-blue-500 text-white"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                >
                    7일
                </button>
                <button
                    onClick={() => setPeriod("30")}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        period === "30"
                            ? "bg-blue-500 text-white"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                >
                    30일
                </button>
            </div>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={formattedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: "#888" }}
                        axisLine={{ stroke: "#e5e5e5" }}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: "#888" }}
                        axisLine={{ stroke: "#e5e5e5" }}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "#fff",
                            border: "1px solid #e5e5e5",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                        }}
                        formatter={(value) => [`${value}통`, "수신"]}
                    />
                    <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

const SENTIMENT_COLORS: { [key: string]: string } = {
    positive: "#22c55e",
    neutral: "#eab308",
    negative: "#ef4444",
    unknown: "#a3a3a3",
};

const SENTIMENT_LABELS: { [key: string]: string } = {
    positive: "긍정 😊",
    neutral: "중립 😐",
    negative: "부정 😢",
    unknown: "분석 전",
};

export function SentimentChart({ data }: { data: DistributionData }) {
    const chartData = Object.entries(data)
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => ({
            name: SENTIMENT_LABELS[key] || key,
            value,
            color: SENTIMENT_COLORS[key] || "#a3a3a3",
        }));

    if (chartData.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-neutral-400 text-sm">
                아직 데이터가 없습니다
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value) => [`${value}통`, ""]}
                    contentStyle={{
                        background: "#fff",
                        border: "1px solid #e5e5e5",
                        borderRadius: "8px",
                    }}
                />
                <Legend
                    formatter={(value) => <span className="text-xs">{value}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

const LANGUAGE_LABELS: { [key: string]: string } = {
    ko: "🇰🇷 한국어",
    en: "🇬🇧 영어",
    ja: "🇯🇵 일본어",
    zh: "🇨🇳 중국어",
    es: "🇪🇸 스페인어",
    pt: "🇧🇷 포르투갈어",
    ar: "🇸🇦 아랍어",
    fr: "🇫🇷 프랑스어",
    de: "🇩🇪 독일어",
    tr: "🇹🇷 터키어",
    th: "🇹🇭 태국어",
    vi: "🇻🇳 베트남어",
    ru: "🇷🇺 러시아어",
    id: "🇮🇩 인도네시아어",
    it: "🇮🇹 이탈리아어",
    hr: "🇭🇷 크로아티아어",
    hu: "🇭🇺 헝가리어",
    sk: "🇸🇰 슬로바키아어",
    unknown: "기타",
};

export function LanguageChart({ data }: { data: DistributionData }) {
    const sortedEntries = Object.entries(data)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1]);

    // 상위 10개 언어만 독립적으로 보여주고, 나머지는 "기타 소수 언어"로 통합
    const top10 = sortedEntries.slice(0, 10);
    const othersCount = sortedEntries.slice(10).reduce((acc, [_, val]) => acc + val, 0);

    const chartData = top10.map(([key, value]) => ({
        name: LANGUAGE_LABELS[key] || key.toUpperCase(),
        count: value,
    }));

    if (othersCount > 0) {
        chartData.push({
            name: "기타",
            count: othersCount,
        });
    }

    if (chartData.length === 0) {
        return (
            <div className="h-[350px] flex items-center justify-center text-neutral-400 text-sm">
                아직 데이터가 없습니다
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#888" }} allowDecimals={false} />
                <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: "#666" }}
                    width={90}
                    interval={0}
                />
                <Tooltip
                    formatter={(value) => [`${value}통`, ""]}
                    contentStyle={{
                        background: "#fff",
                        border: "1px solid #e5e5e5",
                        borderRadius: "8px",
                    }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
