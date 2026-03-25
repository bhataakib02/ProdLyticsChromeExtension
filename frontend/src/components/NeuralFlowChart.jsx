"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Defs,
    LinearGradient,
    Stop
} from "recharts";

export default function NeuralFlowChart({ data }) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-muted/20 font-black uppercase tracking-widest text-xs italic">
                Awaiting Neural Data...
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const date = new Date(label);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const score = payload[0].value;

            return (
                <div className="glass-card p-4 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl bg-black/80">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">{timeStr}</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <p className="text-sm font-black text-white">Neural Load: <span className="text-primary">{score}</span>/10</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full group">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="neuralGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                        dataKey="time"
                        hide
                        tickFormatter={(str) => new Date(str).getHours() + ":00"}
                    />
                    <YAxis
                        domain={[0, 10]}
                        stroke="rgba(255,255,255,0.1)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickCount={6}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                    <Area
                        type="monotone"
                        dataKey="loadScore"
                        stroke="var(--color-primary)"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#neuralGradient)"
                        animationDuration={2500}
                        baseLine={0}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.8))' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
