'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { 
    ArrowLeft, 
    Bike, 
    Car, 
    CheckCircle2, 
    Clock, 
    FileText, 
    HelpCircle, 
    Package, 
    RefreshCw, 
    ShieldAlert, 
    ShieldCheck, 
    Truck, 
    UploadCloud,
    UserCheck
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import Image from 'next/image'

const VEHICLE_TYPES = [
    { id: "bike", label: "Bike", icon: Bike, desc: "2-wheeler quick ride" },
    { id: "auto", label: "Auto", icon: Car, desc: "3-wheeler daily commute" },
    { id: "car", label: "Car", icon: Car, desc: "4-wheeler comfortable cab" },
    { id: "loading", label: "Loading", icon: Package, desc: "Small commercial cargo" },
    { id: "truck", label: "Truck", icon: Truck, desc: "Heavy transport & logistics" },
];

export default function DriverApplyPage() {
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [successMessage, setSuccessMessage] = useState("")

    // Application state
    const [applicationData, setApplicationData] = useState<any>(null)
    const [status, setStatus] = useState<string>("NOT_APPLIED")

    // Form fields
    const [name, setName] = useState("")
    const [mobileNumber, setMobileNumber] = useState("")
    const [licenseNumber, setLicenseNumber] = useState("")
    const [experienceYears, setExperienceYears] = useState("2")
    const [licenseDoc, setLicenseDoc] = useState("")

    const [vehicleType, setVehicleType] = useState("car")
    const [vehicleModel, setVehicleModel] = useState("")
    const [vehicleNumber, setVehicleNumber] = useState("")
    const [rcDoc, setRcDoc] = useState("")
    const [insuranceDoc, setInsuranceDoc] = useState("")

    const fetchStatus = async () => {
        setLoading(true)
        setError("")
        try {
            const { data } = await axios.get("/api/driver/apply")
            if (data.success) {
                setApplicationData(data)
                const user = data.user
                const profile = data.driverProfile
                const vehicle = data.vehicle

                if (user?.name) setName(user.name)
                if (user?.mobileNumber) setMobileNumber(user.mobileNumber)

                if (profile) {
                    if (profile.licenseNumber) setLicenseNumber(profile.licenseNumber)
                    if (profile.experienceYears) setExperienceYears(String(profile.experienceYears))
                    if (profile.licenseDocument) setLicenseDoc(profile.licenseDocument)
                }

                if (vehicle) {
                    if (vehicle.type) setVehicleType(vehicle.type)
                    if (vehicle.vehicleModel) setVehicleModel(vehicle.vehicleModel)
                    if (vehicle.number) setVehicleNumber(vehicle.number)
                    if (vehicle.rcDocument) setRcDoc(vehicle.rcDocument)
                    if (vehicle.insuranceDocument) setInsuranceDoc(vehicle.insuranceDocument)
                }

                // Determine overall status
                if (user?.status === "SUSPENDED" || profile?.status === "SUSPENDED") {
                    setStatus("SUSPENDED")
                } else if (profile?.approvalStatus === "APPROVED" || user?.partnerStatus === "approved") {
                    setStatus("APPROVED")
                } else if (profile?.approvalStatus === "REJECTED" || user?.partnerStatus === "rejected") {
                    setStatus("REJECTED")
                } else if (profile || user?.partnerStatus === "pending") {
                    setStatus("PENDING")
                } else {
                    setStatus("NOT_APPLIED")
                }
            }
        } catch (err: any) {
            if (err?.response?.status === 401) {
                setError("Please log in to submit or view your driver application.")
            } else {
                setError(err?.response?.data?.message || "Failed to load application status.")
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStatus()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccessMessage("")

        if (!mobileNumber || mobileNumber.length < 10) {
            setError("Please enter a valid 10-digit mobile number.")
            return
        }

        if (!licenseNumber || licenseNumber.length < 4) {
            setError("Please enter a valid driving license number.")
            return
        }

        if (!vehicleModel || vehicleModel.length < 2) {
            setError("Please enter your vehicle make and model.")
            return
        }

        if (!vehicleNumber || vehicleNumber.length < 4) {
            setError("Please enter your vehicle registration plate number.")
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                name,
                mobileNumber,
                licenseNumber,
                licenseDocument: licenseDoc || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop",
                experienceYears: Number(experienceYears) || 0,
                vehicleType,
                vehicleModel,
                vehicleNumber,
                rcDocument: rcDoc || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop",
                insuranceDocument: insuranceDoc || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop",
            }

            const { data } = await axios.post("/api/driver/apply", payload)
            if (data.success) {
                setSuccessMessage("Application submitted successfully! Your application is now PENDING admin review.")
                await fetchStatus()
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to submit driver application. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-black" />
                    <p className="text-sm font-medium text-gray-600">Loading driver onboarding...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 text-gray-900 pb-20 pt-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black transition">
                        <ArrowLeft size={16} /> Back to Rydex
                    </Link>
                    <div className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Rydex" width={32} height={32} />
                        <span className="font-bold text-lg tracking-tight">RYDEX Driver Portal</span>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm">
                        <ShieldAlert size={18} className="shrink-0 text-red-600" />
                        <span>{error}</span>
                    </motion.div>
                )}

                {/* Success Banner */}
                {successMessage && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm">
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                        <span>{successMessage}</span>
                    </motion.div>
                )}

                {/* STATUS: PENDING */}
                {status === "PENDING" && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 border border-amber-200 shadow-xl space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                <Clock size={28} className="text-amber-600 animate-pulse" />
                            </div>
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-2">
                                    Application Pending Admin Review
                                </span>
                                <h1 className="text-2xl font-bold text-gray-900">Your Driver Application is Under Review</h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Our platform administration team is currently verifying your driver license and vehicle documents.
                                    You will be eligible to go online and receive rides as soon as an administrator approves your account.
                                </p>
                            </div>
                        </div>

                        <div className="border-t pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-gray-50 p-5 rounded-2xl">
                            <div>
                                <p className="text-gray-500 font-medium text-xs uppercase">Driver Name</p>
                                <p className="font-semibold text-gray-900">{applicationData?.user?.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 font-medium text-xs uppercase">Contact Number</p>
                                <p className="font-semibold text-gray-900">{applicationData?.user?.mobileNumber}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 font-medium text-xs uppercase">License Number</p>
                                <p className="font-semibold text-gray-900">{applicationData?.driverProfile?.licenseNumber || "Submitted"}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 font-medium text-xs uppercase">Vehicle Registered</p>
                                <p className="font-semibold text-gray-900">
                                    {applicationData?.vehicle?.vehicleModel || "Vehicle"} ({applicationData?.vehicle?.number})
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
                            <button
                                onClick={fetchStatus}
                                className="px-5 py-2.5 rounded-full border border-gray-300 font-semibold text-sm hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer"
                            >
                                <RefreshCw size={15} /> Check Approval Status
                            </button>
                            <Link
                                href="/driver/dashboard"
                                className="px-6 py-2.5 rounded-full bg-black text-white font-semibold text-sm hover:bg-gray-800 transition"
                            >
                                Open Driver Console
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* STATUS: APPROVED */}
                {status === "APPROVED" && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl space-y-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                            <ShieldCheck size={36} />
                        </div>
                        <div>
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
                                Driver Account Approved & Active
                            </span>
                            <h1 className="text-3xl font-extrabold text-gray-900">You're Ready to Ride!</h1>
                            <p className="text-sm text-gray-600 max-w-md mx-auto mt-2">
                                Congratulations! Your driver documents and vehicle have been verified and approved by Rydex Administration.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-center gap-4">
                            <Link
                                href="/driver/dashboard"
                                className="px-8 py-3 rounded-full bg-black text-white font-bold text-sm hover:bg-gray-800 transition shadow-lg"
                            >
                                Open Driver Dashboard & Go Online
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* STATUS: SUSPENDED */}
                {status === "SUSPENDED" && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 border border-red-200 shadow-xl space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                                <ShieldAlert size={28} className="text-red-600" />
                            </div>
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 mb-2">
                                    Account Suspended
                                </span>
                                <h1 className="text-2xl font-bold text-gray-900">Driver Account Suspended</h1>
                                <p className="text-sm text-red-700 mt-2 font-medium">
                                    Reason: {applicationData?.driverProfile?.suspendedReason || applicationData?.user?.suspendedReason || "Policy violation or security audit."}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Your account cannot go online or receive ride bookings while suspended. Please contact Rydex platform support for reactivation.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STATUS: NOT_APPLIED OR REJECTED (SHOW FORM) */}
                {(status === "NOT_APPLIED" || status === "REJECTED") && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl space-y-8">
                        {status === "REJECTED" && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-sm">
                                <div className="flex items-center gap-2 font-bold mb-1">
                                    <ShieldAlert size={16} className="text-red-600" />
                                    Previous Application Was Rejected
                                </div>
                                <p className="text-xs text-red-700 mb-2">
                                    Reason: {applicationData?.driverProfile?.rejectionReason || applicationData?.user?.rejectionReason || "Documents were incomplete or unclear."}
                                </p>
                                <p className="text-xs text-gray-600">
                                    Please review and update the required information below, then resubmit for administrator approval.
                                </p>
                            </div>
                        )}

                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                Step 1 of 2 · Partner Onboarding
                            </span>
                            <h1 className="text-3xl font-extrabold mt-3 text-gray-900">Become a Rydex Driver</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Submit your driver and vehicle details. Once verified by our admin team, you will be approved to start receiving rides and earning with Rydex.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Section 1: Driver Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 pb-2 border-b">
                                    <UserCheck size={18} className="text-black" />
                                    1. Driver Personal & License Information
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Mobile Phone (10 digits)</label>
                                        <input
                                            type="tel"
                                            required
                                            maxLength={10}
                                            value={mobileNumber}
                                            onChange={(e) => setMobileNumber(e.target.value)}
                                            placeholder="9876543210"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Driving License Number</label>
                                        <input
                                            type="text"
                                            required
                                            value={licenseNumber}
                                            onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                                            placeholder="DL-14-2018-0012345"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm font-mono uppercase transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Driving Experience (Years)</label>
                                        <select
                                            value={experienceYears}
                                            onChange={(e) => setExperienceYears(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition bg-white"
                                        >
                                            <option value="1">1 Year</option>
                                            <option value="2">2 - 3 Years</option>
                                            <option value="5">4 - 5 Years</option>
                                            <option value="8">5+ Years</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Driving License Photo / Document Link</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={licenseDoc}
                                            onChange={(e) => setLicenseDoc(e.target.value)}
                                            placeholder="https://... (or leave default sample for demo)"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-xs transition"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-1">Provide clear photo URL of your front license card.</p>
                                </div>
                            </div>

                            {/* Section 2: Vehicle Details */}
                            <div className="space-y-4 pt-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 pb-2 border-b">
                                    <Car size={18} className="text-black" />
                                    2. Vehicle Information & Documents
                                </h3>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Select Vehicle Type</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {VEHICLE_TYPES.map((v) => {
                                            const Icon = v.icon
                                            const isSelected = vehicleType === v.id
                                            return (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    onClick={() => setVehicleType(v.id)}
                                                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                                                        isSelected
                                                            ? "bg-black text-white border-black shadow-md"
                                                            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-black"
                                                    }`}
                                                >
                                                    <Icon size={20} />
                                                    <span className="text-xs font-bold">{v.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Vehicle Make & Model</label>
                                        <input
                                            type="text"
                                            required
                                            value={vehicleModel}
                                            onChange={(e) => setVehicleModel(e.target.value)}
                                            placeholder="e.g. Maruti Dzire White, Honda Activa"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Vehicle License Plate Number</label>
                                        <input
                                            type="text"
                                            required
                                            value={vehicleNumber}
                                            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                            placeholder="DL-01-AB-1234"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm font-mono uppercase transition"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Vehicle RC Document Link</label>
                                        <input
                                            type="text"
                                            value={rcDoc}
                                            onChange={(e) => setRcDoc(e.target.value)}
                                            placeholder="https://... (or sample provided)"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-xs transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Vehicle Insurance Document Link</label>
                                        <input
                                            type="text"
                                            value={insuranceDoc}
                                            onChange={(e) => setInsuranceDoc(e.target.value)}
                                            placeholder="https://... (or sample provided)"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-xs transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Terms Notice */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 flex items-start gap-2.5">
                                <HelpCircle size={16} className="text-gray-400 shrink-0 mt-0.5" />
                                <span>
                                    By submitting this application, you declare that all provided documents and license details are genuine. Rydex platform administrators verify every submission before granting ride-dispatch eligibility.
                                </span>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 rounded-full bg-black text-white font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xl"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Submitting Application for Review...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud size={18} />
                                        Submit Driver & Vehicle Application
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

