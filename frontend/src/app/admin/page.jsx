"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    BarChart,
    Bar,
    CartesianGrid,
"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    BarChart,
    Bar,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    Users,
    UserPlus,
    Crown,
    CreditCard,
    Calendar,
    Search,
    Download,
    RefreshCw,
    Shield,
} from "lucide-react";

function inrFromMinor(amount) {
    return `Rs ${(Number(amount || 0) / 100).toFixed(2)}`;
}

function dateFmt(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
}

async function readApiError(res) {
    const raw = await res.text().catch(() => "");
    if (!raw) return `${res.status}`;
    try {
        const j = JSON.parse(raw);
        if (j?.error && typeof j.error === "string") return j.error;
    } catch {
        /* not JSON */
    }
    return raw.slice(0, 200) || `${res.status}`;
}

export default function AdminPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [overview, setOverview] = useState(null);
    const [usersData, setUsersData] = useState({ users: [], total: 0, page: 1, pages: 1 });
    const [paymentsData, setPaymentsData] = useState({ payments: [], total: 0, page: 1, pages: 1, totalRevenue: 0 });
    const [pending, setPending] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [userQuery, setUserQuery] = useState("");
    const [userKind, setUserKind] = useState("all");
    const [userSub, setUserSub] = useState("all");
    const [paymentQuery, setPaymentQuery] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("all");
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [userExportBusy, setUserExportBusy] = useState(null);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [expandedPaymentId, setExpandedPaymentId] = useState(null);

    useEffect(() => {
        if (loading) return;
        if (!user || user.role !== "admin") {
            router.replace("/dashboard");
        }
    }, [user, loading, router]);

    const fetchAdminData = useCallback(async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const bust = `_t=${Date.now()}`;

        setPending(true);
        setLoadError("");
        try {
            const [ovRes, usersRes, payRes] = await Promise.all([
                fetch(
                    `/api/admin/overview?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&${bust}`,
                    {
                        headers,
                        cache: "no-store",
                    }
                ),
                fetch(
                    `/api/admin/users?kind=${encodeURIComponent(userKind)}&subscription=${encodeURIComponent(userSub)}&q=${encodeURIComponent(userQuery)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&${bust}`,
                    { headers, cache: "no-store" }
                ),
                fetch(
                    `/api/admin/payments?status=${encodeURIComponent(paymentStatus)}&q=${encodeURIComponent(paymentQuery)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&${bust}`,
                    { headers, cache: "no-store" }
                ),
            ]);

            if (!ovRes.ok) {
                setLoadError((await readApiError(ovRes)) || "Overview request failed.");
                return;
            }
            if (!usersRes.ok) {
                setLoadError((await readApiError(usersRes)) || "Users request failed.");
                return;
            }
            if (!payRes.ok) {
                setLoadError((await readApiError(payRes)) || "Payments request failed.");
                return;
            }

            const [ov, us, py] = await Promise.all([ovRes.json(), usersRes.json(), payRes.json()]);
            setOverview(ov);
            setUsersData(us);
            setPaymentsData(py);
        } catch (e) {
            setLoadError(e?.message || "Network error while loading admin data.");
        } finally {
            setPending(false);
        }
    }, [fromDate, toDate, userKind, userSub, userQuery, paymentStatus, paymentQuery]);

    async function downloadCsv(pathname, filename) {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(pathname, { headers, cache: "no-store" });
        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(txt || `Export failed (${res.status})`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function exportUsersCsv() {
        try {
            await downloadCsv(
                `/api/admin/export/users?q=${encodeURIComponent(userQuery)}&kind=${encodeURIComponent(userKind)}&subscription=${encodeURIComponent(userSub)}`,
                "prodlytics-admin-users.csv"
            );
        } catch (e) {
            alert(e?.message || "Failed to export users CSV.");
        }
    }

    async function exportPaymentsCsv() {
        try {
            await downloadCsv(
                `/api/admin/export/payments?q=${encodeURIComponent(paymentQuery)}&status=${encodeURIComponent(paymentStatus)}`,
                "prodlytics-admin-payments.csv"
            );
        } catch (e) {
            alert(e?.message || "Failed to export payments CSV.");
        }
    }

    /**
     * Per-user data for GDPR / support email — CSV (ZIP) or PDF only.
     */
    async function downloadUserDataExport(userId, kind) {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const qs = new URLSearchParams();
        let filename = `prodlytics-user-${userId}-export`;

        if (kind === "csv") {
            qs.set("format", "csv");
            filename = `prodlytics-user-${userId}-data-csv.zip`;
        } else if (kind === "pdf") {
            qs.set("format", "pdf");
            filename = `prodlytics-user-${userId}-data-summary.pdf`;
        } else {
            return;
        }

        setUserExportBusy(userId);
        try {
            const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/export-data?${qs}`, {
                headers,
                cache: "no-store",
            });
            if (!res.ok) {
                alert(await readApiError(res));
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert(e?.message || "Failed to download user export.");
        } finally {
            setUserExportBusy(null);
        }
    }

    useEffect(() => {
        if (!user || user.role !== "admin") return;
        fetchAdminData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role, userKind, userSub, userQuery, paymentStatus, paymentQuery, fromDate, toDate]);

    async function updateUserRole(userId, role) {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ role }),
        });
        if (!res.ok) {
            alert(await readApiError(res));
            return;
        }
        fetchAdminData();
    }

    async function markRefunded(paymentId) {
        if (!window.confirm("Mark this payment as refunded in ProdLytics? (Does not refund in Stripe.)")) return;
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/admin/payments/${encodeURIComponent(paymentId)}/refund`, { method: "PATCH", headers });
        if (!res.ok) {
            alert(await readApiError(res));
            return;
        }
        fetchAdminData();
    }

    async function updateUserSubscription(userId, subscription) {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const label = subscription === "pro" ? "Grant ProdLytics Pro for this user?" : "Set this user to Free?";
        if (!window.confirm(label)) return;
        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/subscription`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ subscription }),
        });
        if (!res.ok) {
            alert(await readApiError(res));
            return;
        }
        fetchAdminData();
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            alert("Could not copy.");
        }
    }

    const chartData = useMemo(() => {
        const base = Array.isArray(overview?.growthSeries) ? overview.growthSeries : [];
        return base.map((x) => ({
            ...x,
            revenueINR: Number(x.revenue || 0) / 100,
            day: String(x.date || "").slice(5),
        }));
    }, [overview]);

    if (loading || !user || user.role !== "admin") return null;

    const k = overview?.kpis || {};

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">Admin Dashboard</h1>
                        <p className="text-sm font-medium text-muted">Manage users, transactions, and system health.</p>
                    </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-xl border border-ui bg-background px-9 py-2 text-sm sm:w-auto outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-xl border border-ui bg-background px-9 py-2 text-sm sm:w-auto outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" />
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchAdminData()}
                        disabled={pending}
                        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={pending ? "animate-spin" : ""} />
                        <span>{pending ? "Refreshing…" : "Refresh"}</span>
                    </button>
                </div>
            </div>

            {loadError ? (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{loadError}</div>
            ) : null}

            <p className="text-xs text-muted">
                Charts and revenue use the <strong className="text-foreground/90">date range</strong> above. Widen “To” to include recent payments if revenue looks empty.
            </p>

            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Users"
                    value={k.totalUsers ?? 0}
                    icon={<Users className="text-primary" size={22} />}
                    color="primary"
                />
                <StatCard
                    label="Registered Users"
                    value={k.registeredUsers ?? 0}
                    icon={<UserPlus className="text-secondary" size={22} />}
                    color="secondary"
                />
                <StatCard
                    label="Premium (Pro)"
                    value={k.proUsers ?? 0}
                    icon={<Crown className="text-amber-400" size={22} />}
                    color="warning"
                />
                <StatCard
                    label="Revenue"
                    value={inrFromMinor(k.totalRevenue)}
                    icon={<CreditCard className="text-success" size={22} />}
                    color="success"
                />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-background p-4">
                    <h2 className="mb-3 text-sm font-bold text-foreground">User growth (30 days)</h2>
                    <div className="h-72">
                        {mounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-ui-muted)" vertical={false} />
                                    <XAxis 
                                        dataKey="day" 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: "var(--color-muted)" }} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        allowDecimals={false} 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: "var(--color-muted)" }} 
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line 
                                        type="monotone" 
                                        dataKey="users" 
                                        stroke="var(--color-primary)" 
                                        strokeWidth={3} 
                                        dot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 2, stroke: "var(--color-background)" }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        name="New users" 
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-background p-4">
                    <h2 className="mb-3 text-sm font-bold text-foreground">Revenue (30 days)</h2>
                    <div className="h-72">
                        {mounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-ui-muted)" vertical={false} />
                                    <XAxis 
                                        dataKey="day" 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: "var(--color-muted)" }} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: "var(--color-muted)" }} 
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar 
                                        dataKey="revenueINR" 
                                        fill="var(--color-success)" 
                                        radius={[4, 4, 0, 0]}
                                        name="Revenue (INR)" 
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-background p-4">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <div className="relative min-w-0 flex-1 sm:min-w-[280px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                            <input
                                value={userQuery}
                                onChange={(e) => setUserQuery(e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full rounded-xl border border-ui bg-background/50 pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                            />
                        </div>
                        <select value={userKind} onChange={(e) => setUserKind(e.target.value)} className="rounded-xl border border-ui bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="all">All Users</option>
                            <option value="anonymous">Anonymous</option>
                            <option value="registered">Registered</option>
                        </select>
                        <select value={userSub} onChange={(e) => setUserSub(e.target.value)} className="rounded-xl border border-ui bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="all">All Plans</option>
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                        </select>
                        <button type="button" onClick={exportUsersCsv} className="flex items-center gap-2 rounded-xl border border-ui bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-foreground/5">
                            <Download size={14} />
                            <span>Export</span>
                        </button>
                    </div>
                    <h2 className="mb-2 text-sm font-bold text-foreground">Users ({usersData.total || 0})</h2>
                    <div className="max-h-96 overflow-x-auto overflow-y-auto text-sm">
                        <table className="w-full min-w-[720px]">
                            <thead className="text-left text-xs text-muted">
                                <tr>
                                    <th className="py-2">Name</th>
                                    <th>Email</th>
                                    <th>Type</th>
                                    <th>Plan</th>
                                    <th>Role</th>
                                    <th className="w-10 text-right"> </th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersData.users?.map((u) => (
                                    <Fragment key={u.id}>
                                        <tr
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setExpandedUserId((id) => (id === u.id ? null : u.id))}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    setExpandedUserId((id) => (id === u.id ? null : u.id));
                                                }
                                            }}
                                            className="group cursor-pointer border-t border-ui-muted transition-colors hover:bg-foreground/[0.02]"
                                        >
                                            <td className="py-2 font-medium text-foreground max-w-[150px] truncate" title={u.name}>{u.name}</td>
                                            <td className="max-w-[200px] truncate" title={u.email}>{u.email || "-"}</td>
                                            <td>{u.isAnonymous ? "Anonymous" : "Registered"}</td>
                                            <td className="uppercase">{u.subscription}</td>
                                            <td>{u.role}</td>
                                            <td className="text-right text-muted" aria-hidden>
                                                {expandedUserId === u.id ? "▲" : "▼"}
                                            </td>
                                        </tr>
                                        {expandedUserId === u.id ? (
                                            <tr className="border-t border-ui-muted bg-foreground/[0.035]">
                                                <td colSpan={6} className="px-3 py-3">
                                                    <div
                                                        className="flex min-w-[240px] flex-col gap-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                    >
                                                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                                                            Actions for this user
                                                        </p>
                                                        <button
                                                            type="button"
                                                            disabled={userExportBusy === u.id}
                                                            onClick={() => downloadUserDataExport(u.id, "csv")}
                                                            className="rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors disabled:opacity-50"
                                                            style={{ 
                                                                backgroundColor: 'var(--success-badge-bg)', 
                                                                color: 'var(--success-badge-text)',
                                                                borderColor: 'var(--success-badge-border)'
                                                            }}
                                                            title="ZIP of CSV files (Excel/Sheets) — full export."
                                                        >
                                                            {userExportBusy === u.id ? "Preparing…" : "Their data · CSV (ZIP)"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={userExportBusy === u.id}
                                                            onClick={() => downloadUserDataExport(u.id, "pdf")}
                                                            className="rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors disabled:opacity-50"
                                                            style={{ 
                                                                backgroundColor: 'var(--danger-badge-bg)', 
                                                                color: 'var(--danger-badge-text)',
                                                                borderColor: 'var(--danger-badge-border)'
                                                            }}
                                                        >
                                                            Their data · PDF summary
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateUserRole(u.id, u.role === "admin" ? "user" : "admin")}
                                                            className="rounded-lg border border-white/25 bg-foreground/[0.06] px-3 py-2 text-left text-xs font-semibold hover:bg-foreground/10"
                                                        >
                                                            {u.role === "admin" ? "Remove admin role" : "Promote to admin"}
                                                        </button>
                                                        {u.subscription === "pro" ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateUserSubscription(u.id, "free")}
                                                                className="rounded-lg border border-white/25 px-3 py-2 text-left text-xs font-semibold hover:bg-foreground/10"
                                                            >
                                                                Set plan: Free
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateUserSubscription(u.id, "pro")}
                                                                className="rounded-lg border border-primary/35 bg-primary/15 px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/25"
                                                            >
                                                                Grant ProdLytics Pro
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-background p-4">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <div className="relative min-w-0 flex-1 sm:min-w-[280px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                            <input
                                value={paymentQuery}
                                onChange={(e) => setPaymentQuery(e.target.value)}
                                placeholder="Search by email..."
                                className="w-full rounded-xl border border-ui bg-background/50 pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                            />
                        </div>
                        <select
                            value={paymentStatus}
                            onChange={(e) => setPaymentStatus(e.target.value)}
                            className="rounded-xl border border-ui bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="all">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="canceled">Canceled</option>
                            <option value="refunded">Refunded</option>
                        </select>
                        <button type="button" onClick={exportPaymentsCsv} className="flex items-center gap-2 rounded-xl border border-ui bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-foreground/5">
                            <Download size={14} />
                            <span>Export</span>
                        </button>
                    </div>
                    <h2 className="mb-2 text-sm font-bold text-foreground">
                        Payments ({paymentsData.total || 0}) - {inrFromMinor(paymentsData.totalRevenue || 0)}
                    </h2>
                    <p className="mb-2 text-[11px] text-muted">Tap a payment row for refunds and Stripe IDs.</p>
                    <div className="max-h-96 overflow-x-auto overflow-y-auto text-sm">
                        <table className="w-full min-w-[720px]">
                            <thead className="text-left text-xs text-muted">
                                <tr>
                                    <th className="py-2">Email</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Type</th>
                                    <th>Time</th>
                                    <th className="w-10 text-right"> </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentsData.payments?.map((p) => (
                                    <Fragment key={p.id}>
                                        <tr
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setExpandedPaymentId((id) => (id === p.id ? null : p.id))}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    setExpandedPaymentId((id) => (id === p.id ? null : p.id));
                                                }
                                            }}
                                            className="cursor-pointer border-t border-ui-muted hover:bg-foreground/[0.04]"
                                        >
                                            <td className="py-2 font-medium text-foreground">{p.email || "-"}</td>
                                            <td>{inrFromMinor(p.amount)}</td>
                                            <td className="capitalize">{p.status}</td>
                                            <td>{p.type}</td>
                                            <td>{dateFmt(p.createdAt)}</td>
                                            <td className="text-right text-muted" aria-hidden>
                                                {expandedPaymentId === p.id ? "▲" : "▼"}
                                            </td>
                                        </tr>
                                        {expandedPaymentId === p.id ? (
                                            <tr className="border-t border-ui-muted bg-foreground/[0.035]">
                                                <td colSpan={6} className="px-3 py-3">
                                                    <div
                                                        className="flex min-w-[188px] flex-col gap-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                                                            Actions for this payment
                                                        </p>
                                                        {p.status === "paid" ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => markRefunded(p.id)}
                                                                className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-left text-xs font-semibold text-amber-100 hover:bg-amber-400/20"
                                                            >
                                                                Mark refunded (dashboard only)
                                                            </button>
                                                        ) : p.status === "refunded" ? (
                                                            <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-muted">
                                                                Recorded as refunded — issue refunds in Stripe if needed.
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-muted">
                                                                No dashboard action for “{p.status}”. Update via Stripe or webhooks.
                                                            </span>
                                                        )}
                                                        {p.stripeSessionId ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyText(p.stripeSessionId)}
                                                                className="rounded-lg border border-white/20 px-3 py-2 text-left text-xs font-medium hover:bg-foreground/10"
                                                            >
                                                                Copy Stripe session ID
                                                            </button>
                                                        ) : null}
                                                        {p.stripeSubscriptionId ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyText(p.stripeSubscriptionId)}
                                                                className="rounded-lg border border-white/20 px-3 py-2 text-left text-xs font-medium hover:bg-foreground/10"
                                                            >
                                                                Copy subscription ID
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {pending ? <p className="text-sm text-muted">Loading admin data...</p> : null}
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card rounded-xl border border-ui p-3 shadow-xl">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">{label}</p>
                {payload.map((entry, idx) => (
                    <p key={idx} className="text-sm font-bold text-foreground">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                        {entry.name}: {typeof entry.value === 'number' && entry.name.includes('Revenue') ? `Rs ${entry.value.toFixed(2)}` : entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
}

function StatCard({ label, value, icon, color }) {
    const colorMap = {
        primary: "bg-primary/10",
        secondary: "bg-secondary/10",
        warning: "bg-amber-400/10",
        success: "bg-success/10",
    };

    return (
        <div className="glass-card group flex items-center gap-4 rounded-2xl border border-ui p-6 transition-all hover:border-primary/20 hover:shadow-lg">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorMap[color] || "bg-foreground/5"}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">{label}</p>
                <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
            </div>
        </div>
    );
}
