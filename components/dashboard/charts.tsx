"use client";

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

// 7일 추이 라인 차트
export function TrendChart({ data }: { data: TrendData[] }) {
    const formattedData = data.map(item => ({
        ...item,
        date: item.date ? item.date.slice(5) : "", // MM-DD 형식으로 표시
    }));

    return (
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
    );
}

// 감정별 분포 파이 차트
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

// 언어별 분포 바 차트
const LANGUAGE_LABELS: { [key: string]: string } = {
    ko: "🇰🇷 한국어",
    en: "🇺🇸 영어",
    ja: "🇯🇵 일본어",
    zh: "🇨🇳 중국어",
    es: "🇪🇸 스페인어",
    unknown: "기타",
};

export function LanguageChart({ data }: { data: DistributionData }) {
    const chartData = Object.entries(data)
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => ({
            name: LANGUAGE_LABELS[key] || key.toUpperCase(),
            count: value,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // 상위 6개만 표시

    if (chartData.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-neutral-400 text-sm">
                아직 데이터가 없습니다
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#888" }} allowDecimals={false} />
                <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: "#666" }}
                    width={80}
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
