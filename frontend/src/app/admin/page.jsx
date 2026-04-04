"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Activity,
    Users,
    CreditCard,
    TrendingUp,
    Shield,
    Search,
    Download,
    Calendar,
    Filter,
    UserPlus,
    RefreshCw,
    Crown,
    Settings,
    FileText,
    CheckCircle2,
    AlertCircle,
    Copy,
    ExternalLink,
    Lock,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
} from "recharts";
import { useAuth, API_URL } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

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

    // Dynamic Enhancements
    const [activeTab, setActiveTab] = useState("overview"); // "overview" | "policies"

    // Policy Suite
    const [policyKey, setPolicyKey] = useState("privacy_policy");
    const [policies, setPolicies] = useState({
        privacy_policy: "",
        terms_of_service: "",
        cookie_policy: "",
    });
    const [savingPolicy, setSavingPolicy] = useState(false);
    const [policyMsg, setPolicyMsg] = useState({ type: "", text: "" });
    const [policyDates, setPolicyDates] = useState({
        privacy_policy: "",
        terms_of_service: "",
        cookie_policy: "",
    });

    // Bulk Actions
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [isBulkLoading, setIsBulkLoading] = useState(false);

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
            
            // Also refresh policies if we're on that tab (or always for consistency)
            if (activeTab === "policies") {
                await fetchPolicies();
            }
        } catch (e) {
            setLoadError(e?.message || "Network error while loading admin data.");
        } finally {
            setPending(false);
        }
    }, [fromDate, toDate, userQuery, userKind, userSub, paymentQuery, paymentStatus]);

    const fetchPolicies = useCallback(async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        if (!token) return;
        try {
            const res = await fetch("/api/admin/site-config", {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store"
            });
            if (res.ok) {
                const data = await res.json();
                setPolicies(prev => ({
                    ...prev,
                    privacy_policy: data.find(c => c.key === "privacy_policy")?.value ?? prev.privacy_policy,
                    terms_of_service: data.find(c => c.key === "terms_of_service")?.value ?? prev.terms_of_service,
                    cookie_policy: data.find(c => c.key === "cookie_policy")?.value ?? prev.cookie_policy,
                }));
                setPolicyDates(prev => ({
                    ...prev,
                    privacy_policy: data.find(c => c.key === "privacy_policy_date")?.value ?? prev.privacy_policy,
                    terms_of_service: data.find(c => c.key === "terms_of_service_date")?.value ?? prev.terms_of_service,
                    cookie_policy: data.find(c => c.key === "cookie_policy_date")?.value ?? prev.cookie_policy,
                }));
            } else {
                console.error("Policy fetch non-ok");
            }
        } catch (e) {
            console.error("Policy fetch error:", e);
        }
    }, []);

    const savePolicy = async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        if (!token) return;
        setSavingPolicy(true);
        setPolicyMsg({ type: "", text: "" });
        try {
            const [res1, res2] = await Promise.all([
                fetch("/api/admin/site-config", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ key: policyKey, value: policies[policyKey] })
                }),
                fetch("/api/admin/site-config", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ key: `${policyKey}_date`, value: policyDates[policyKey] })
                })
            ]);
            if (res1.ok && res2.ok) {
                setPolicyMsg({ type: "success", text: `${policyKey.split('_').join(' ')} updated successfully!` });
            } else {
                setPolicyMsg({ type: "error", text: "Failed to update policy." });
            }
        } catch {
            setPolicyMsg({ type: "error", text: "Network error." });
        } finally {
            setSavingPolicy(false);
        }
    };

    useEffect(() => {
        if (activeTab === "policies") {
            fetchPolicies();
        }
    }, [activeTab, fetchPolicies]);

    // Also load policies immediately on mount so PDF/ZIP exports work right away
    useEffect(() => {
        if (user?.role === "admin") {
            fetchPolicies();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role]);

    const downloadPolicyPDF = async () => {
        // Auto-fetch if not yet loaded
        let content = policies[policyKey];
        if (!content) {
            await fetchPolicies();
            // Read from ref is not possible, re-read via API directly
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
                const res = await fetch("/api/admin/site-config", {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store"
                });
                if (res.ok) {
                    const data = await res.json();
                    content = data.find(c => c.key === policyKey)?.value || "";
                }
            } catch { /**/ }
        }
        if (!content) {
            alert("No policy content found. Please save content first.");
            return;
        }
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(policyKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        const splitText = doc.splitTextToSize(content, 180);
        doc.text(splitText, 14, 40);
        doc.save(`${policyKey}.pdf`);
    };

    const downloadPoliciesZip = async () => {
        let pols = { ...policies };
        // If all empty, fetch first
        const hasContent = Object.values(pols).some(v => v);
        if (!hasContent) {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
                const res = await fetch("/api/admin/site-config", {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store"
                });
                if (res.ok) {
                    const data = await res.json();
                    ["privacy_policy", "terms_of_service", "cookie_policy"].forEach(k => {
                        pols[k] = data.find(c => c.key === k)?.value || "";
                    });
                }
            } catch { /**/ }
        }
        const anyContent = Object.values(pols).some(v => v);
        if (!anyContent) {
            alert("No policy content to export. Please save content first.");
            return;
        }
        const zip = new JSZip();
        Object.entries(pols).forEach(([key, val]) => {
            if (val) zip.file(`${key}.txt`, val);
        });
        const blob = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ProdLytics_Policies.zip";
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleUserSelection = (id) => {
        const next = new Set(selectedUserIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedUserIds(next);
    };

    const handleBulkAction = async (action) => {
        if (!selectedUserIds.size) return;
        if (!confirm(`Are you sure you want to ${action} ${selectedUserIds.size} users?`)) return;

        setIsBulkLoading(true);
        const token = localStorage.getItem("accessToken");
        try {
            const results = await Promise.all([...selectedUserIds].map(async (id) => {
                const res = await fetch(`/api/admin/users/${id}`, {
                    method: action === "delete" ? "DELETE" : "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: action === "downgrade" ? JSON.stringify({ subscription: "free" }) : undefined
                });
                return res.ok;
            }));

            const successCount = results.filter(Boolean).length;
            alert(`${successCount}/${selectedUserIds.size} users ${action}d.`);
            setSelectedUserIds(new Set());
            fetchAdminData();
        } catch (e) {
            alert("Bulk action failed: " + e.message);
        } finally {
            setIsBulkLoading(false);
        }
    };

    const downloadFullReportPDF = () => {
        if (!overview) return;
        const doc = new jsPDF();
        const now = new Date().toLocaleString();

        doc.setFontSize(20);
        doc.text("ProdLytics Admin Report", 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${now}`, 14, 30);
        doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 35);

        const k = overview.kpis;
        autoTable(doc, {
            startY: 45,
            head: [["Metric", "Value"]],
            body: [
                ["Total Users", k.totalUsers],
                ["Registered Users", k.registeredUsers],
                ["Anonymous Users", k.anonymousUsers],
                ["Pro Users", k.proUsers],
                ["Total Revenue", inrFromMinor(k.totalRevenue)],
                ["New Payments", k.paidPayments],
            ],
            theme: "grid",
            headStyles: { fillColor: [79, 70, 229] },
        });

        doc.setFontSize(14);
        doc.text("Recent User Activity", 14, doc.lastAutoTable.finalY + 15);
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [["Name", "Email", "Type", "Plan", "Joined"]],
            body: overview.recentUsers.map(u => [
                u.name,
                u.email || "Anonymous",
                u.isAnonymous ? "Anon" : "Registered",
                u.subscription.toUpperCase(),
                new Date(u.createdAt).toLocaleDateString()
            ]),
        });

        doc.save(`ProdLytics_Report_${fromDate}_to_${toDate}.pdf`);
    };

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
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-lg bg-foreground/5 p-1">
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                    activeTab === "overview"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-foreground/60 hover:text-foreground"
                                )}
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab("policies")}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                    activeTab === "policies"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-foreground/60 hover:text-foreground"
                                )}
                            >
                                Policies
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => fetchAdminData()}
                            disabled={pending}
                            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            <RefreshCw className={cn("w-4 h-4", pending && "animate-spin")} />
                            <span>Sync</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
                {activeTab === "overview" ? (
                    <>
                        {loadError ? (
                            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{loadError}</div>
                        ) : null}

                        <p className="text-xs text-muted">
                            Charts and revenue use the <strong className="text-foreground/90">date range</strong> above. Widen “To” to include recent payments if revenue looks empty.
                        </p>

                        <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-5">
                            <StatCard
                                label="Users"
                                value={k.totalUsers ?? 0}
                                icon={<Users className="text-primary" size={20} />}
                                color="primary"
                            />
                            <StatCard
                                label="Anon"
                                value={k.anonymousUsers ?? 0}
                                icon={<Activity className="text-neutral-400" size={20} />}
                                color="neutral"
                            />
                            <StatCard
                                label="Reg."
                                value={k.registeredUsers ?? 0}
                                icon={<UserPlus className="text-secondary" size={20} />}
                                color="secondary"
                            />
                            <StatCard
                                label="Pro"
                                value={k.proUsers ?? 0}
                                icon={<Crown className="text-warning" size={20} />}
                                color="warning"
                            />
                            <StatCard
                                label="Rev"
                                value={inrFromMinor(k.totalRevenue)}
                                icon={<TrendingUp className="text-success" size={20} />}
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
                                    <button type="button" onClick={exportUsersCsv} className="flex h-10 items-center gap-2 rounded-xl border border-ui bg-background px-4 text-sm font-bold text-foreground hover:bg-foreground/5 transition-colors">
                                        <Download size={14} />
                                        <span>Export</span>
                                    </button>
                                </div>

                                {selectedUserIds.size > 0 && (
                                    <div className="flex items-center gap-4 p-4 mb-4 rounded-2xl bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-2">
                                        <span className="text-sm font-bold text-primary">{selectedUserIds.size} users selected</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleBulkAction("downgrade")}
                                                disabled={isBulkLoading}
                                                className="px-3 py-1.5 rounded-lg bg-foreground/5 text-xs font-bold hover:bg-foreground/10 transition-colors"
                                            >
                                                Downgrade to Free
                                            </button>
                                            <button
                                                onClick={() => handleBulkAction("delete")}
                                                disabled={isBulkLoading}
                                                className="px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 transition-colors"
                                            >
                                                Delete Selected
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Users className="text-primary" size={20} />
                                        <h2 className="text-lg font-bold text-foreground">Users ({usersData.total})</h2>
                                    </div>
                                    <button
                                        onClick={downloadFullReportPDF}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-foreground/10 text-xs font-medium hover:bg-foreground/5 transition-colors"
                                    >
                                        <Download size={14} />
                                        <span>Export PDF Report</span>
                                    </button>
                                </div>
                                <div className="max-h-[500px] overflow-x-auto overflow-y-auto text-sm no-scrollbar border-t border-ui-muted">
                                    <table className="w-full min-w-[760px] border-collapse">
                                        <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                                            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-muted">
                                                <th className="px-4 py-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedUserIds(new Set(usersData.users.map(u => u.id)));
                                                            else setSelectedUserIds(new Set());
                                                        }}
                                                        checked={selectedUserIds.size === usersData.users.length && usersData.users.length > 0}
                                                        className="rounded border-ui bg-background"
                                                    />
                                                </th>
                                                <th className="px-4 py-4">Name</th>
                                                <th className="px-4 py-4">Email</th>
                                                <th className="px-4 py-4">Type</th>
                                                <th className="px-4 py-4">Plan</th>
                                                <th className="px-4 py-4">Role</th>
                                                <th className="px-4 py-4 text-right"> </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-ui-muted">
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
                                                        className={cn(
                                                            "group cursor-pointer transition-all hover:bg-foreground/[0.03]",
                                                            expandedUserId === u.id ? "bg-foreground/[0.04]" : "",
                                                            selectedUserIds.has(u.id) && "bg-primary/5"
                                                        )}
                                                    >
                                                        <td className="px-4 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUserIds.has(u.id)}
                                                                onChange={() => toggleUserSelection(u.id)}
                                                                className="rounded border-ui bg-background"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-4 font-bold text-foreground max-w-[160px] truncate" title={u.name}>{u.name || "Anonymous User"}</td>
                                                        <td className="px-4 py-4 text-muted max-w-[200px] truncate font-medium" title={u.email}>{u.email || "-"}</td>
                                                        <td className="px-4 py-4">
                                                            <Badge variant={u.isAnonymous ? "neutral" : "primary"}>
                                                                {u.isAnonymous ? "Anonymous" : "Registered"}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <Badge variant={u.subscription === "pro" ? "warning" : "secondary"}>
                                                                {u.subscription?.toUpperCase()}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <Badge variant={u.role === "admin" ? "indigo" : "outline"}>
                                                                {u.role}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-muted" aria-hidden>
                                                            <div className={cn("inline-flex h-6 w-6 items-center justify-center rounded-lg border border-ui transition-transform", expandedUserId === u.id ? "rotate-180 bg-primary/10 text-primary border-primary/20" : "")}>
                                                                <Filter size={10} className="rotate-90" />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {expandedUserId === u.id ? (
                                                        <tr className="bg-foreground/[0.02]">
                                                            <td colSpan={6} className="px-4 py-6 border-ui-muted/50">
                                                                <div
                                                                    className="flex flex-wrap gap-3"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                >
                                                                    <p className="w-full mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                                                        User Management Actions
                                                                    </p>
                                                                    <button
                                                                        type="button"
                                                                        disabled={userExportBusy === u.id}
                                                                        onClick={() => downloadUserDataExport(u.id, "csv")}
                                                                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ui bg-background px-4 text-xs font-bold text-foreground transition-all hover:bg-foreground/5 disabled:opacity-40"
                                                                        title="ZIP of CSV files (Excel/Sheets) — full export."
                                                                    >
                                                                        <Download size={14} />
                                                                        {userExportBusy === u.id ? "Syncing…" : "Export Data"}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateUserRole(u.id, u.role === "admin" ? "user" : "admin")}
                                                                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ui bg-background px-4 text-xs font-bold text-foreground transition-all hover:bg-foreground/5"
                                                                    >
                                                                        <Shield size={14} />
                                                                        {u.role === "admin" ? "Revoke Admin" : "Grant Admin"}
                                                                    </button>
                                                                    {u.subscription === "pro" ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateUserSubscription(u.id, "free")}
                                                                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ui bg-background px-4 text-xs font-bold text-muted-foreground/60 transition-all hover:bg-foreground/5"
                                                                        >
                                                                            <RefreshCw size={14} />
                                                                            Downgrade to Free
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateUserSubscription(u.id, "pro")}
                                                                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-400 px-4 text-xs font-black text-amber-950 shadow-lg shadow-amber-400/20 transition-all hover:opacity-90"
                                                                        >
                                                                            <Crown size={14} />
                                                                            Upgrade to Pro
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

                            <div className="rounded-2xl border border-ui bg-background p-1 shadow-sm">
                                <div className="flex flex-wrap items-center gap-3 p-3">
                                    <div className="relative min-w-0 flex-1 sm:min-w-[280px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                                        <input
                                            value={paymentQuery}
                                            onChange={(e) => setPaymentQuery(e.target.value)}
                                            placeholder="Search by email..."
                                            className="h-10 w-full rounded-xl border border-ui bg-background/50 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                    <select
                                        value={paymentStatus}
                                        onChange={(e) => setPaymentStatus(e.target.value)}
                                        className="h-10 rounded-xl border border-ui bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none min-w-[120px]"
                                    >
                                        <option value="all">All States</option>
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Failed</option>
                                        <option value="refunded">Refunded</option>
                                    </select>
                                    <button type="button" onClick={exportPaymentsCsv} className="flex h-10 items-center gap-2 rounded-xl border border-ui bg-background px-4 text-sm font-bold text-foreground hover:bg-foreground/5 transition-colors">
                                        <Download size={14} />
                                        <span>Export</span>
                                    </button>
                                </div>
                                <div className="px-4 py-1">
                                    <h2 className="text-sm font-bold text-foreground">
                                        Payments ({paymentsData.total || 0}) <span className="mx-2 opacity-30">/</span> <span className="text-success">{inrFromMinor(paymentsData.totalRevenue || 0)}</span>
                                    </h2>
                                </div>
                                <div className="max-h-[500px] overflow-x-auto overflow-y-auto text-sm no-scrollbar border-t border-ui-muted mt-3">
                                    <table className="w-full min-w-[760px] border-collapse">
                                        <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                                            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-muted">
                                                <th className="px-4 py-4">Customer</th>
                                                <th className="px-4 py-4">Amount</th>
                                                <th className="px-4 py-4">Status</th>
                                                <th className="px-4 py-4">Type</th>
                                                <th className="px-4 py-4">Date</th>
                                                <th className="px-4 py-4 text-right"> </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-ui-muted">
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
                                                        className={cn(
                                                            "group cursor-pointer transition-all hover:bg-foreground/[0.03]",
                                                            expandedPaymentId === p.id ? "bg-foreground/[0.04]" : ""
                                                        )}
                                                    >
                                                        <td className="px-4 py-4 font-bold text-foreground">{p.email || "Guest"}</td>
                                                        <td className="px-4 py-4 font-medium text-foreground">{inrFromMinor(p.amount)}</td>
                                                        <td className="px-4 py-4">
                                                            <Badge
                                                                variant={
                                                                    p.status === "paid" ? "success" :
                                                                        p.status === "refunded" ? "neutral" :
                                                                            p.status === "failed" ? "danger" : "warning"
                                                                }
                                                            >
                                                                {p.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-4 text-muted font-medium">{p.type}</td>
                                                        <td className="px-4 py-4 text-muted font-medium">{dateFmt(p.createdAt)}</td>
                                                        <td className="px-4 py-4 text-right text-muted" aria-hidden>
                                                            <div className={cn("inline-flex h-6 w-6 items-center justify-center rounded-lg border border-ui transition-transform", expandedPaymentId === p.id ? "rotate-180 bg-primary/10 text-primary border-primary/20" : "")}>
                                                                <Filter size={10} className="rotate-90" />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {expandedPaymentId === p.id ? (
                                                        <tr className="bg-foreground/[0.02]">
                                                            <td colSpan={6} className="px-4 py-6 border-ui-muted/50">
                                                                <div
                                                                    className="flex flex-wrap gap-3"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <p className="w-full mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                                                        Financial & Support Actions
                                                                    </p>
                                                                    {p.status === "paid" ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => markRefunded(p.id)}
                                                                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ui bg-background px-4 text-xs font-bold text-foreground transition-all hover:bg-foreground/5"
                                                                        >
                                                                            <RefreshCw size={14} />
                                                                            Mark Refunded (Local Only)
                                                                        </button>
                                                                    ) : (
                                                                        <span className="inline-flex h-9 items-center rounded-xl border border-ui/50 bg-foreground/[0.02] px-4 text-xs font-bold text-muted-foreground/50">
                                                                            Status: {p.status}
                                                                        </span>
                                                                    )}
                                                                    {p.stripeSessionId ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => copyText(p.stripeSessionId)}
                                                                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ui bg-background px-4 text-xs font-bold text-foreground transition-all hover:bg-foreground/5"
                                                                        >
                                                                            Copy Stripe Session
                                                                        </button>
                                                                    ) : null}
                                                                    {p.stripeSubscriptionId ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => copyText(p.stripeSubscriptionId)}
                                                                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ui bg-background px-4 text-xs font-bold text-foreground transition-all hover:bg-foreground/5"
                                                                        >
                                                                            Copy Subscription ID
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
                    </>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Policy Selector Sidebar */}
                            <div className="lg:w-64 flex flex-col gap-2">
                                {[
                                    { key: "privacy_policy", label: "Privacy Policy" },
                                    { key: "terms_of_service", label: "Terms of Service" },
                                    { key: "cookie_policy", label: "Cookie Policy" },
                                ].map((p) => (
                                    <button
                                        key={p.key}
                                        onClick={() => {
                                            setPolicyKey(p.key);
                                            setPolicyMsg({ type: "", text: "" });
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                                            policyKey === p.key
                                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
                                        )}
                                    >
                                        <FileText size={18} />
                                        <span>{p.label}</span>
                                    </button>
                                ))}

                                <div className="mt-4 pt-4 border-t border-foreground/10 space-y-2">
                                    <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-foreground/40">Exports</p>
                                    <button onClick={downloadPolicyPDF} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-foreground/60 hover:text-primary transition-colors">
                                        <Download size={14} />
                                        <span>Download PDF</span>
                                    </button>
                                    <button onClick={downloadPoliciesZip} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-foreground/60 hover:text-primary transition-colors">
                                        <Copy size={14} />
                                        <span>Export All (ZIP)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Editor Area */}
                            <div className="flex-1 rounded-3xl border border-foreground/10 bg-background/50 p-6 backdrop-blur-xl sm:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground">{policyKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h2>
                                        <p className="text-sm text-foreground/60">Configure public legal document content.</p>
                                    </div>
                                    <button
                                        onClick={savePolicy}
                                        disabled={savingPolicy}
                                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/25 hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {savingPolicy ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
                                        <span>{savingPolicy ? "Saving..." : "Save Changes"}</span>
                                    </button>
                                </div>

                                {policyMsg.text && (
                                    <div className={cn(
                                        "mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm",
                                        policyMsg.type === "success"
                                            ? "bg-success/10 border-success/20 text-success"
                                            : "bg-danger/10 border-danger/20 text-danger"
                                    )}>
                                        {policyMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                        <p className="font-medium">{policyMsg.text}</p>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">Last Updated Date</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. April 4, 2026"
                                        value={policyDates[policyKey] || ""}
                                        onChange={(e) => setPolicyDates({ ...policyDates, [policyKey]: e.target.value })}
                                        className="w-full sm:w-64 rounded-xl border border-ui bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                                    />
                                </div>

                                <div className="relative group">
                                    <textarea
                                        value={policies[policyKey]}
                                        onChange={(e) => setPolicies({ ...policies, [policyKey]: e.target.value })}
                                        placeholder={`Enter ${policyKey.split('_').join(' ')} text here...`}
                                        className="w-full min-h-[500px] bg-foreground/5 border-2 border-transparent focus:border-primary/30 rounded-2xl p-6 text-sm leading-relaxed text-foreground/90 font-mono focus:outline-none transition-all resize-none"
                                    />
                                    <div className="absolute inset-0 rounded-2xl pointer-events-none border border-foreground/10 group-hover:border-foreground/20 transition-colors" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {pending ? (
                <p className="text-sm text-muted">Loading admin data...</p>
            ) : null}
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
        neutral: "bg-foreground/5",
    };

    return (
        <div className="glass-card group flex items-center gap-5 rounded-2xl border border-ui p-6 transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${colorMap[color] || "bg-foreground/5"} transition-transform group-hover:scale-110`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">{label}</p>
                <p className="text-3xl font-black tracking-tight text-foreground">{value}</p>
            </div>
        </div>
    );
}

function Badge({ children, variant = "neutral" }) {
    const variants = {
        primary: "bg-primary/10 text-primary border-primary/20",
        secondary: "bg-secondary/10 text-secondary border-secondary/20",
        success: "bg-success/10 text-success border-success/20",
        warning: "bg-amber-400/10 text-amber-500 border-amber-400/20",
        danger: "bg-red-500/10 text-red-500 border-red-500/20",
        indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        neutral: "bg-foreground/5 text-muted-foreground/80 border-ui",
        outline: "border-ui text-muted-foreground/70",
    };

    return (
        <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
            variants[variant] || variants.neutral
        )}>
            {children}
        </span>
    );
}
