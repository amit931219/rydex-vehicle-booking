'use client'
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    Bike,
    Car,
    CheckCircle2,
    Clock,
    FileText,
    Navigation,
    Package,
    Power,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Truck,
    UserCheck,
    Users
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function DriverDashboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [statusData, setStatusData] = useState<any>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

    const fetchStatus = async () => {
        try {
            const { data } = await axios.get("/api/driver/status")
            if (data.success) {
                setStatusData(data)
            }
        } catch (err: any) {
            console.error("fetchStatus error:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStatus()
    }, [])

    const handleToggleOnline = async () => {
        if (!statusData?.canGoOnline && !statusData?.isOnline) {
            setMessage({
                text: "Cannot go online: Both your driver account and vehicle must be approved by Rydex Admin.",
                type: "error",
            })
            return
        }

        setActionLoading(true)
        setMessage(null)
        try {
            const { data } = await axios.post("/api/driver/toggle-online", {
                isOnline: !statusData?.isOnline,
            })
            if (data.success) {
                setMessage({ text: data.message, type: "success" })
                await fetchStatus()
            }
        } catch (err: any) {
            setMessage({
                text: err?.response?.data?.message || "Failed to update online status",
                type: "error",
            })
        } finally {
            setActionLoading(false)
        }
    }

    const handleToggleAvailability = async () => {
        setActionLoading(true)
        setMessage(null)
        try {
            const { data } = await axios.post("/api/driver/toggle-availability", {
                isAvailable: !statusData?.isAvailable,
            })
            if (data.success) {
                setMessage({ text: data.message, type: "success" })
                await fetchStatus()
            }
        } catch (err: any) {
            setMessage({
                text: err?.response?.data?.message || "Failed to update availability",
                type: "error",
            })
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-black" />
                    <p className="text-sm font-medium text-gray-600">Loading Driver Console...</p>
                </div>
            </div>
        )
    }

    const isDriverApproved = statusData?.driverApprovalStatus === "APPROVED" && statusData?.driverStatus !== "SUSPENDED"
    const isVehicleApproved = statusData?.vehicle?.approvalStatus === "APPROVED" && statusData?.vehicle?.isActive
    const isOnline = Boolean(statusData?.isOnline)
    const isAvailable = Boolean(statusData?.isAvailable)

    return (
        <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 text-gray-900 pb-20 pt-8 px-4">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="w-10 h-10 rounded-full border bg-white flex items-center justify-center hover:bg-gray-100 transition shadow-xs">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Driver Command Center</h1>
                            <p className="text-xs sm:text-sm text-gray-500">Manage your duty status, vehicles, and active dispatches</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchStatus}
                            className="p-2.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:text-black hover:border-black transition cursor-pointer shadow-xs"
                            title="Refresh status"
                        >
                            <RefreshCw size={16} />
                        </button>
                        <Link
                            href="/"
                            className="px-4 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 font-semibold text-xs transition"
                        >
                            Customer App
                        </Link>
                    </div>
                </div>

                {/* Notifications */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
                                message.type === "success"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-red-50 border-red-200 text-red-800"
                            }`}
                        >
                            {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span>{message.text}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Status Banners if Not Fully Approved */}
                {!isDriverApproved && (
                    <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-start gap-3 max-w-xl">
                            <Clock size={24} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-amber-900 text-base">Driver Approval Status: {statusData?.driverApprovalStatus || "PENDING"}</h3>
                                <p className="text-xs text-amber-700 mt-1">
                                    {statusData?.driverApprovalStatus === "REJECTED"
                                        ? `Application rejected: ${statusData?.rejectionReason || "Please update your details."}`
                                        : statusData?.driverApprovalStatus === "SUSPENDED"
                                        ? `Account suspended: ${statusData?.suspendedReason || "Contact administrator."}`
                                        : "Your application is currently pending administrator verification. You cannot go online until approved."}
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/driver/apply"
                            className="px-5 py-2 rounded-full bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition"
                        >
                            {statusData?.driverApprovalStatus === "REJECTED" ? "Update Application" : "View Application"}
                        </Link>
                    </div>
                )}

                {/* Main Duty & Status Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Big Online/Offline Card */}
                    <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Duty Status</span>
                                <h2 className="text-2xl font-black mt-1">
                                    {isOnline ? "🟢 YOU ARE ONLINE" : "⚪ YOU ARE OFFLINE"}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {isOnline
                                        ? "Receiving ride dispatches in your area."
                                        : "Switch online when you are ready to accept trips."}
                                </p>
                            </div>

                            <span
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                    isOnline ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                                }`}
                            >
                                {isOnline ? "Online" : "Offline"}
                            </span>
                        </div>

                        <div className="my-8">
                            <button
                                onClick={handleToggleOnline}
                                disabled={actionLoading || (!isOnline && !statusData?.canGoOnline)}
                                className={`w-full py-5 rounded-2xl font-extrabold text-base tracking-wide flex items-center justify-center gap-3 transition shadow-lg cursor-pointer ${
                                    isOnline
                                        ? "bg-red-600 text-white hover:bg-red-700 shadow-red-200"
                                        : !statusData?.canGoOnline
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        : "bg-black text-white hover:bg-gray-800 shadow-gray-300"
                                }`}
                            >
                                <Power size={22} className={actionLoading ? "animate-spin" : ""} />
                                {actionLoading
                                    ? "Updating Status..."
                                    : isOnline
                                    ? "GO OFFLINE"
                                    : !statusData?.canGoOnline
                                    ? "APPROVAL REQUIRED TO GO ONLINE"
                                    : "GO ONLINE FOR RIDES"}
                            </button>
                        </div>

                        <div className="pt-4 border-t flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                                <Activity size={14} className={isOnline ? "text-emerald-500" : "text-gray-400"} />
                                <span>Availability Mode:</span>
                                <button
                                    onClick={handleToggleAvailability}
                                    disabled={!isOnline || actionLoading}
                                    className={`font-bold uppercase underline cursor-pointer disabled:opacity-50 ${
                                        isAvailable ? "text-emerald-600" : "text-amber-600"
                                    }`}
                                >
                                    {isAvailable ? "Available" : "Busy / Break"}
                                </button>
                            </div>

                            <span>Location updates active</span>
                        </div>
                    </div>

                    {/* Driver Profile Summary Card */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xl flex flex-col justify-between space-y-6">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Driver Credentials</span>
                            <div className="mt-3 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-black text-white font-bold text-lg flex items-center justify-center shrink-0">
                                    {statusData?.user?.name?.charAt(0)?.toUpperCase() || "D"}
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-gray-900 leading-tight">{statusData?.user?.name}</h3>
                                    <p className="text-xs text-gray-500">{statusData?.user?.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 bg-gray-50 p-4 rounded-2xl text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Driver Approval:</span>
                                <span className={`font-bold px-2 py-0.5 rounded-full ${
                                    statusData?.driverApprovalStatus === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                }`}>
                                    {statusData?.driverApprovalStatus || "PENDING"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Account Standing:</span>
                                <span className={`font-bold px-2 py-0.5 rounded-full ${
                                    statusData?.driverStatus === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                }`}>
                                    {statusData?.driverStatus || "ACTIVE"}
                                </span>
                            </div>
                        </div>

                        <Link
                            href="/driver/apply"
                            className="w-full py-2.5 rounded-xl border border-gray-300 text-center font-semibold text-xs hover:bg-gray-50 transition"
                        >
                            Update Profile / Documents
                        </Link>
                    </div>
                </div>

                {/* Vehicle Details Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Assigned Fleet Vehicle</span>
                            <h3 className="text-xl font-bold mt-0.5">
                                {statusData?.vehicle ? statusData.vehicle.vehicleModel : "No Vehicle Registered"}
                            </h3>
                        </div>

                        {statusData?.vehicle && (
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                    statusData.vehicle.approvalStatus === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                }`}>
                                    {statusData.vehicle.approvalStatus || statusData.vehicle.status}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                    statusData.vehicle.isActive ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                                }`}>
                                    {statusData.vehicle.isActive ? "Active in Fleet" : "Inactive"}
                                </span>
                            </div>
                        )}
                    </div>

                    {statusData?.vehicle ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div className="bg-gray-50 p-4 rounded-2xl">
                                <span className="text-gray-400 font-bold uppercase block mb-1">Plate Number</span>
                                <span className="font-mono text-sm font-bold text-gray-900">{statusData.vehicle.number}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl">
                                <span className="text-gray-400 font-bold uppercase block mb-1">Vehicle Category</span>
                                <span className="text-sm font-bold text-gray-900 uppercase">{statusData.vehicle.type}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl">
                                <span className="text-gray-400 font-bold uppercase block mb-1">RC Verification</span>
                                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                                    <ShieldCheck size={14} /> Verified
                                </span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl">
                                <span className="text-gray-400 font-bold uppercase block mb-1">Insurance</span>
                                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                                    <ShieldCheck size={14} /> Active
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500 text-sm">
                            <p>You have not registered any vehicle yet.</p>
                            <Link href="/driver/apply" className="inline-block mt-3 px-6 py-2 rounded-full bg-black text-white font-bold text-xs">
                                Register Vehicle
                            </Link>
                        </div>
                    )}
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Link
                        href="/partner/pending-requests"
                        className="bg-white rounded-3xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition flex flex-col justify-between group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
                                <Clock size={24} />
                            </div>
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                Realtime
                            </span>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-gray-900">Pending Requests</h4>
                            <p className="text-xs text-gray-500 mt-1">Accept or decline incoming customer ride dispatches.</p>
                        </div>
                    </Link>

                    <Link
                        href="/partner/active-ride"
                        className="bg-white rounded-3xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition flex flex-col justify-between group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                                <Navigation size={24} />
                            </div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                Live GPS
                            </span>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-gray-900">Active Ride</h4>
                            <p className="text-xs text-gray-500 mt-1">Navigate to pickup location and enter ride PIN.</p>
                        </div>
                    </Link>

                    <Link
                        href="/partner/bookings"
                        className="bg-white rounded-3xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition flex flex-col justify-between group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                                <FileText size={24} />
                            </div>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                                History
                            </span>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-gray-900">Ride History & Earnings</h4>
                            <p className="text-xs text-gray-500 mt-1">Review completed trips, commissions, and fares.</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}

