'use client'
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    Bike,
    Car,
    Check,
    CheckCircle2,
    Clock,
    DollarSign,
    FileText,
    Filter,
    Package,
    RefreshCw,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Truck,
    UserCheck,
    Users,
    X,
    XCircle
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import TabButton from '@/components/TabButton'

type Tab = "overview" | "drivers" | "vehicles" | "users" | "bookings"

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<Tab>("drivers")
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>(null)

    // Data lists
    const [drivers, setDrivers] = useState<any[]>([])
    const [vehicles, setVehicles] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [bookings, setBookings] = useState<any[]>([])

    // Filters & Search
    const [driverFilter, setDriverFilter] = useState("all")
    const [vehicleFilter, setVehicleFilter] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")

    // Modals
    const [modalData, setModalData] = useState<{
        open: boolean;
        type: "rejectDriver" | "suspendDriver" | "rejectVehicle";
        id: string;
        name: string;
    }>({ open: false, type: "rejectDriver", id: "", name: "" })
    const [actionReason, setActionReason] = useState("")
    const [actionLoading, setActionLoading] = useState(false)
    const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null)
    const [unauthorized, setUnauthorized] = useState(false)

    const fetchAllData = async () => {
        setLoading(true)
        try {
            const statsRes = await axios.get("/api/admin/stats").catch((err) => err.response || { data: { stats: {} } })
            if (statsRes?.status === 401 || statsRes?.status === 403) {
                setUnauthorized(true)
                setLoading(false)
                return
            }
            setUnauthorized(false)

            const [driversRes, vehiclesRes, usersRes, bookingsRes] = await Promise.all([
                axios.get(`/api/admin/drivers?status=${driverFilter}`).catch(() => ({ data: { drivers: [] } })),
                axios.get(`/api/admin/vehicles?status=${vehicleFilter}`).catch(() => ({ data: { vehicles: [] } })),
                axios.get("/api/admin/users").catch(() => ({ data: { users: [] } })),
                axios.get("/api/admin/bookings").catch(() => ({ data: { bookings: [] } })),
            ])

            setStats(statsRes.data?.stats || {})
            setDrivers(driversRes.data?.drivers || [])
            setVehicles(vehiclesRes.data?.vehicles || [])
            setUsers(usersRes.data?.users || [])
            setBookings(bookingsRes.data?.bookings || [])
        } catch (err) {
            console.error("Failed to load admin data:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAllData()
    }, [driverFilter, vehicleFilter])

    const handleApproveDriver = async (driverId: string) => {
        setActionLoading(true)
        setFeedback(null)
        try {
            const { data } = await axios.post(`/api/admin/drivers/${driverId}/approve`)
            setFeedback({ text: data.message || "Driver approved successfully", type: "success" })
            await fetchAllData()
        } catch (err: any) {
            setFeedback({ text: err?.response?.data?.message || "Failed to approve driver", type: "error" })
        } finally {
            setActionLoading(false)
        }
    }

    const handleReactivateDriver = async (driverId: string) => {
        setActionLoading(true)
        setFeedback(null)
        try {
            const { data } = await axios.post(`/api/admin/drivers/${driverId}/reactivate`)
            setFeedback({ text: data.message || "Driver reactivated", type: "success" })
            await fetchAllData()
        } catch (err: any) {
            setFeedback({ text: err?.response?.data?.message || "Failed to reactivate driver", type: "error" })
        } finally {
            setActionLoading(false)
        }
    }

    const handleApproveVehicle = async (vehicleId: string) => {
        setActionLoading(true)
        setFeedback(null)
        try {
            const { data } = await axios.post(`/api/admin/vehicles/${vehicleId}/approve`)
            setFeedback({ text: data.message || "Vehicle approved", type: "success" })
            await fetchAllData()
        } catch (err: any) {
            setFeedback({ text: err?.response?.data?.message || "Failed to approve vehicle", type: "error" })
        } finally {
            setActionLoading(false)
        }
    }

    const handleToggleVehicleActive = async (vehicleId: string) => {
        setActionLoading(true)
        setFeedback(null)
        try {
            const { data } = await axios.post(`/api/admin/vehicles/${vehicleId}/toggle-active`)
            setFeedback({ text: data.message || "Vehicle status updated", type: "success" })
            await fetchAllData()
        } catch (err: any) {
            setFeedback({ text: err?.response?.data?.message || "Failed to toggle vehicle status", type: "error" })
        } finally {
            setActionLoading(false)
        }
    }

    const submitModalAction = async () => {
        if (!modalData.id) return
        setActionLoading(true)
        setFeedback(null)
        try {
            if (modalData.type === "rejectDriver") {
                const { data } = await axios.post(`/api/admin/drivers/${modalData.id}/reject`, {
                    reason: actionReason || "Application requirements were not met.",
                })
                setFeedback({ text: data.message, type: "success" })
            } else if (modalData.type === "suspendDriver") {
                const { data } = await axios.post(`/api/admin/drivers/${modalData.id}/suspend`, {
                    reason: actionReason || "Suspended by platform administrator.",
                })
                setFeedback({ text: data.message, type: "success" })
            } else if (modalData.type === "rejectVehicle") {
                const { data } = await axios.post(`/api/admin/vehicles/${modalData.id}/reject`, {
                    reason: actionReason || "Vehicle did not pass inspection standards.",
                })
                setFeedback({ text: data.message, type: "success" })
            }

            setModalData({ open: false, type: "rejectDriver", id: "", name: "" })
            setActionReason("")
            await fetchAllData()
        } catch (err: any) {
            setFeedback({ text: err?.response?.data?.message || "Action failed", type: "error" })
        } finally {
            setActionLoading(false)
        }
    }

    const filteredDrivers = drivers.filter((d) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            d.name?.toLowerCase().includes(q) ||
            d.email?.toLowerCase().includes(q) ||
            d.mobileNumber?.includes(q) ||
            d.driverProfile?.licenseNumber?.toLowerCase().includes(q)
        )
    })

    if (unauthorized) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-900">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Admin Console Restricted</h2>
                        <p className="text-xs text-gray-600 mt-2">
                            You must be signed in with an Administrator account to access the platform management dashboard.
                        </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl text-left text-xs space-y-2 border">
                        <p className="font-bold text-gray-700">Ready Test Admin Account:</p>
                        <p className="text-gray-600">Email: <b className="text-black font-mono">admin@rydex.com</b></p>
                        <p className="text-gray-600">Password: <b className="text-black font-mono">Admin@1234</b></p>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                        <Link href="/" className="w-full py-3 rounded-full bg-black text-white text-xs font-bold hover:bg-gray-800 transition">
                            Back to Rydex Home / Login
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-gray-100 to-gray-200 text-gray-900 pb-20">
            {/* Top Navigation */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b z-40 shadow-xs">
                <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Image src="/logo.png" alt="Rydex Logo" width={38} height={38} priority />
                        </Link>
                        <div>
                            <span className="font-extrabold text-base tracking-tight block">RYDEX PLATFORM</span>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Admin Management Console</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchAllData}
                            className="p-2 rounded-full border bg-gray-50 text-gray-700 hover:text-black hover:bg-white transition cursor-pointer"
                            title="Refresh Data"
                        >
                            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                        </button>
                        <Link
                            href="/"
                            className="text-xs font-semibold px-4 py-2 rounded-full bg-black text-white hover:bg-gray-800 transition"
                        >
                            Exit Console
                        </Link>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
                {/* Feedback Alert */}
                <AnimatePresence>
                    {feedback && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
                                feedback.type === "success"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-red-50 border-red-200 text-red-800"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                <span>{feedback.text}</span>
                            </div>
                            <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-black">
                                <X size={16} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Platform KPI Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white p-4 rounded-2xl border shadow-xs">
                        <span className="text-gray-400 text-[11px] font-bold uppercase block">Total Users</span>
                        <span className="text-2xl font-black mt-1 block">{stats?.totalUsers ?? 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
                        <span className="text-amber-700 text-[11px] font-bold uppercase block">Pending Drivers</span>
                        <span className="text-2xl font-black text-amber-700 mt-1 block">{stats?.pendingDrivers ?? 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
                        <span className="text-emerald-700 text-[11px] font-bold uppercase block">Approved Drivers</span>
                        <span className="text-2xl font-black text-emerald-700 mt-1 block">{stats?.approvedDrivers ?? 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-xs">
                        <span className="text-gray-400 text-[11px] font-bold uppercase block">Online Drivers</span>
                        <span className="text-2xl font-black text-emerald-600 mt-1 block">🟢 {stats?.onlineDrivers ?? 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-xs">
                        <span className="text-gray-400 text-[11px] font-bold uppercase block">Total Fleet</span>
                        <span className="text-2xl font-black mt-1 block">{stats?.totalVehicles ?? 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border shadow-xs">
                        <span className="text-gray-400 text-[11px] font-bold uppercase block">Total Trips</span>
                        <span className="text-2xl font-black mt-1 block">{stats?.totalBookings ?? 0}</span>
                    </div>
                </div>

                {/* Tabs Header */}
                <div className="bg-white rounded-2xl p-2 border shadow-xs flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveTab("drivers")}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                            activeTab === "drivers" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <UserCheck size={16} />
                        Driver Applications
                        {stats?.pendingDrivers > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-black font-extrabold">
                                {stats.pendingDrivers}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("vehicles")}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                            activeTab === "vehicles" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <Car size={16} />
                        Fleet Vehicles ({stats?.totalVehicles ?? 0})
                    </button>

                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                            activeTab === "users" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <Users size={16} />
                        Registered Riders ({stats?.totalUsers ?? 0})
                    </button>

                    <button
                        onClick={() => setActiveTab("bookings")}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                            activeTab === "bookings" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <Activity size={16} />
                        Live Trips & Bookings ({stats?.totalBookings ?? 0})
                    </button>
                </div>

                {/* TAB 1: DRIVER APPLICATIONS */}
                {activeTab === "drivers" && (
                    <div className="space-y-6">
                        {/* Filters & Search */}
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border shadow-xs">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-gray-400 uppercase mr-1">Status:</span>
                                {["all", "pending", "approved", "rejected", "suspended"].map((st) => (
                                    <button
                                        key={st}
                                        onClick={() => setDriverFilter(st)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                                            driverFilter === st ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>

                            <div className="relative min-w-[260px]">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-black transition"
                                />
                            </div>
                        </div>

                        {/* Drivers Table / Cards */}
                        {filteredDrivers.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center text-gray-500 border">
                                <Users size={36} className="mx-auto text-gray-300 mb-2" />
                                <p className="font-semibold text-base">No driver applications found</p>
                                <p className="text-xs text-gray-400 mt-1">Try selecting a different status filter</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredDrivers.map((driver) => {
                                    const approvalStatus = driver.approvalStatus || (driver.partnerStatus === "approved" ? "APPROVED" : driver.partnerStatus === "rejected" ? "REJECTED" : "PENDING")
                                    const isSuspended = driver.isSuspended || driver.status === "SUSPENDED"

                                    return (
                                        <div
                                            key={driver._id}
                                            className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-bold text-lg text-gray-900">{driver.name}</h3>
                                                    <span
                                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                                            isSuspended
                                                                ? "bg-red-100 text-red-800"
                                                                : approvalStatus === "APPROVED"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : approvalStatus === "REJECTED"
                                                                ? "bg-red-100 text-red-800"
                                                                : "bg-amber-100 text-amber-800"
                                                        }`}
                                                    >
                                                        {isSuspended ? "SUSPENDED" : approvalStatus}
                                                    </span>
                                                    {driver.isOnline && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                            🟢 Online Now
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500">
                                                    <span>📧 {driver.email}</span>
                                                    <span>📱 {driver.mobileNumber || "N/A"}</span>
                                                    <span>
                                                        🪪 License: <b className="text-gray-900 font-mono">{driver.driverProfile?.licenseNumber || "N/A"}</b>
                                                    </span>
                                                    <span>
                                                        🚗 Fleet:{" "}
                                                        <b className="text-gray-900">
                                                            {driver.vehicles?.length > 0
                                                                ? `${driver.vehicles[0].vehicleModel} (${driver.vehicles[0].number})`
                                                                : "No vehicle"}
                                                        </b>
                                                    </span>
                                                </div>

                                                {driver.rejectionReason && (
                                                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg inline-block">
                                                        ⚠️ Rejection Reason: {driver.rejectionReason}
                                                    </p>
                                                )}
                                                {driver.suspendedReason && (
                                                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg inline-block">
                                                        🚫 Suspension Reason: {driver.suspendedReason}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                {isSuspended ? (
                                                    <button
                                                        onClick={() => handleReactivateDriver(driver._id)}
                                                        disabled={actionLoading}
                                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                                                    >
                                                        Reactivate Driver
                                                    </button>
                                                ) : approvalStatus === "APPROVED" ? (
                                                    <button
                                                        onClick={() =>
                                                            setModalData({
                                                                open: true,
                                                                type: "suspendDriver",
                                                                id: driver._id,
                                                                name: driver.name,
                                                            })
                                                        }
                                                        disabled={actionLoading}
                                                        className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition cursor-pointer"
                                                    >
                                                        Suspend Driver
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveDriver(driver._id)}
                                                            disabled={actionLoading}
                                                            className="px-5 py-2 rounded-xl bg-black hover:bg-gray-800 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                                        >
                                                            <Check size={14} /> Approve Driver
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setModalData({
                                                                    open: true,
                                                                    type: "rejectDriver",
                                                                    id: driver._id,
                                                                    name: driver.name,
                                                                })
                                                            }
                                                            disabled={actionLoading}
                                                            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-700 font-bold text-xs transition cursor-pointer"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: VEHICLES */}
                {activeTab === "vehicles" && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 bg-white p-4 rounded-2xl border shadow-xs">
                            <span className="text-xs font-bold text-gray-400 uppercase mr-1">Status:</span>
                            {["all", "pending", "approved", "rejected"].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setVehicleFilter(st)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                                        vehicleFilter === st ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {vehicles.map((v) => (
                                <div key={v._id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
                                                {v.type === "bike" ? <Bike size={18} /> : v.type === "truck" ? <Truck size={18} /> : <Car size={18} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-base text-gray-900">{v.vehicleModel}</h4>
                                                <p className="font-mono text-xs text-gray-500 font-bold uppercase">{v.number}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    v.status === "approved"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : v.status === "rejected"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-amber-100 text-amber-800"
                                                }`}
                                            >
                                                {v.status}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    v.isActive ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                                                }`}
                                            >
                                                {v.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl space-y-1">
                                        <p>👤 Owner: <b className="text-gray-900">{v.owner?.name || "Unassigned"}</b> ({v.owner?.email || ""})</p>
                                        <p>💵 Fare Structure: Base ₹{v.baseFare ?? 50} · ₹{v.pricePerKM ?? 12}/km</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                                        {v.status === "pending" ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleApproveVehicle(v._id)}
                                                    className="px-4 py-1.5 rounded-lg bg-black text-white font-bold hover:bg-gray-800 transition cursor-pointer"
                                                >
                                                    Approve Vehicle
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setModalData({
                                                            open: true,
                                                            type: "rejectVehicle",
                                                            id: v._id,
                                                            name: v.vehicleModel,
                                                        })
                                                    }
                                                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-red-50 text-red-700 font-bold transition cursor-pointer"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleToggleVehicleActive(v._id)}
                                                className={`px-4 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                                                    v.isActive ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                                                }`}
                                            >
                                                {v.isActive ? "Deactivate Vehicle" : "Activate Vehicle"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 3: USERS (RIDERS) */}
                {activeTab === "users" && (
                    <div className="bg-white rounded-2xl border shadow-xs overflow-hidden">
                        <div className="p-4 border-b">
                            <h3 className="font-bold text-base">Registered Riders & Accounts</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 border-b text-gray-500 uppercase font-bold text-[10px]">
                                    <tr>
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Phone</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Joined Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.map((u) => (
                                        <tr key={u._id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-bold text-gray-900">{u.name}</td>
                                            <td className="p-4 text-gray-600">{u.email}</td>
                                            <td className="p-4 text-gray-600">{u.mobileNumber || "—"}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                                    u.role === "admin" ? "bg-purple-100 text-purple-800" : u.role === "partner" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                                                }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                                    u.status === "SUSPENDED" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                                                }`}>
                                                    {u.status || "ACTIVE"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 4: BOOKINGS */}
                {activeTab === "bookings" && (
                    <div className="bg-white rounded-2xl border shadow-xs overflow-hidden">
                        <div className="p-4 border-b">
                            <h3 className="font-bold text-base">Recent Rides & Platform Dispatches</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 border-b text-gray-500 uppercase font-bold text-[10px]">
                                    <tr>
                                        <th className="p-4">Ride ID</th>
                                        <th className="p-4">Customer</th>
                                        <th className="p-4">Driver</th>
                                        <th className="p-4">Pickup → Drop</th>
                                        <th className="p-4">Fare</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {bookings.map((b) => (
                                        <tr key={b._id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-mono font-bold">{String(b._id).slice(-6)}</td>
                                            <td className="p-4 font-semibold">{b.user?.name || "Customer"}</td>
                                            <td className="p-4 font-semibold">{b.driver?.name || "Assigned Driver"}</td>
                                            <td className="p-4 text-gray-600 max-w-[200px] truncate">
                                                {b.pickUpAddress} → {b.dropAddress}
                                            </td>
                                            <td className="p-4 font-bold text-gray-900">₹{b.fare}</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    b.bookingStatus === "completed"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : b.bookingStatus === "started"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : b.bookingStatus === "confirmed"
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-gray-100 text-gray-700"
                                                }`}>
                                                    {b.bookingStatus}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500">
                                                {b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Action Reason Modal (Reject / Suspend) */}
            <AnimatePresence>
                {modalData.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg text-gray-900">
                                    {modalData.type === "suspendDriver"
                                        ? "Suspend Driver Account"
                                        : modalData.type === "rejectDriver"
                                        ? "Reject Driver Application"
                                        : "Reject Vehicle"}
                                </h3>
                                <button
                                    onClick={() => setModalData({ open: false, type: "rejectDriver", id: "", name: "" })}
                                    className="text-gray-400 hover:text-black cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-xs text-gray-600">
                                Provide an explanation reason for <b>{modalData.name}</b>. This reason will be recorded in audit logs and displayed to the applicant.
                            </p>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Reason / Notes</label>
                                <textarea
                                    rows={3}
                                    value={actionReason}
                                    onChange={(e) => setActionReason(e.target.value)}
                                    placeholder="e.g. License photo is expired or illegible. Please submit valid document."
                                    className="w-full p-3 rounded-xl border border-gray-300 text-xs focus:border-black focus:ring-1 focus:ring-black outline-none transition"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setModalData({ open: false, type: "rejectDriver", id: "", name: "" })}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitModalAction}
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                                >
                                    {actionLoading ? "Processing..." : "Confirm Action"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

