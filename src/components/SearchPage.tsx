'use client'
import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, Bike, Car, MapPin, Navigation, RefreshCcw, Search, Sparkles, Truck, Zap } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
const SearchMap = dynamic(() => import("@/components/SearchMap"), { ssr: false })
import axios from 'axios'
import { vehicleType } from '@/models/vehicle.model'
import VehicleCard from '@/components/VehicleCard'

const CATEGORIES = [
    { id: "all", label: "All Rides", Icon: Sparkles },
    { id: "bike", label: "Bike", Icon: Bike },
    { id: "auto", label: "Auto", Icon: Car },
    { id: "car", label: "Car", Icon: Car },
    { id: "loading", label: "Loading", Icon: Truck },
    { id: "truck", label: "Truck", Icon: Truck },
];

interface IVehicle {
    _id: string
    owner: string
    type: vehicleType
    vehicleModel: string
    number: string
    imageUrl?: string
    baseFare?: number
    pricePerKM?: number
    waitingCharge?: number
    status: "approved" | "pending" | "rejected"
    rejectionReason?: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

function SearchPage() {
    const router = useRouter()
    const params = useSearchParams()
    const [pickUp, setPickUp] = useState(params.get("pickup") || "")
    const [drop, setDrop] = useState(params.get("drop") || "")
    const [km, setKm] = useState<number>(0)
    const mobile = params.get("mobile") || ""
    const initialPickUpLat = Number(params.get("pickuplat"))
    const initialPickUpLon = Number(params.get("pickuplon"))
    const initialDropLat = Number(params.get("droplat"))
    const initialDropLon = Number(params.get("droplon"))
    const initialVehicle = params.get("vehicle") || "all"

    const [selectedCategory, setSelectedCategory] = useState<string>(initialVehicle)
    const [pickUpCoord, setPickUpCoord] = useState<[number, number] | null>(
        !isNaN(initialPickUpLat) && initialPickUpLat !== 0 && !isNaN(initialPickUpLon) && initialPickUpLon !== 0
            ? [initialPickUpLat, initialPickUpLon]
            : null
    )
    const [dropCoord, setDropCoord] = useState<[number, number] | null>(
        !isNaN(initialDropLat) && initialDropLat !== 0 && !isNaN(initialDropLon) && initialDropLon !== 0
            ? [initialDropLat, initialDropLon]
            : null
    )

    const [vehicles, setVehicles] = useState<IVehicle[]>([])
    const [loading, setLoading] = useState(false)

    const getNearByVehicles = async (latitude?: number | null, longitude?: number | null, vehicleType?: string | null) => {
        setLoading(true)
        try {
            const typeFilter = vehicleType && vehicleType !== "all" ? vehicleType : null
            const { data } = await axios.post("/api/vehicles/near-by", {
                latitude: latitude || 28.6139,
                longitude: longitude || 77.2090,
                vehicleType: typeFilter
            })
            if (Array.isArray(data)) {
                setVehicles(data)
            }
            setLoading(false)
        } catch (error) {
            console.error("Error fetching vehicles:", error)
            setLoading(false)
        }
    }

    // Load vehicles on mount or when coordinates / category change
    useEffect(() => {
        const lat = pickUpCoord ? pickUpCoord[0] : (!isNaN(initialPickUpLat) && initialPickUpLat !== 0 ? initialPickUpLat : 28.6139)
        const lon = pickUpCoord ? pickUpCoord[1] : (!isNaN(initialPickUpLon) && initialPickUpLon !== 0 ? initialPickUpLon : 77.2090)
        getNearByVehicles(lat, lon, selectedCategory)
    }, [selectedCategory, pickUpCoord])

    return (
        <div className='min-h-screen bg-zinc-100 text-zinc-900 overflow-x-hidden'>
            <div className='absolute top-5 left-5 z-50'>
                <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => router.back()}
                    className="w-11 h-11 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center hover:bg-zinc-50 transition-colors"
                >
                    <ArrowLeft size={17} className="text-zinc-900" />
                </motion.button>
            </div>

            <div className='relative w-full h-[48vh] z-0'>
                <SearchMap
                    pickUp={pickUp}
                    drop={drop}
                    onChange={(p, d) => { setPickUp(p); setDrop(d) }}
                    onDistance={setKm}
                    onCoordinates={(p1, p2) => {
                        setPickUpCoord(p1)
                        setDropCoord(p2)
                        getNearByVehicles(p1[0], p1[1], selectedCategory)
                    }}
                />
            </div>

            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 160, damping: 22 }}
                className="relative z-20 -mt-10 bg-white rounded-t-[28px] border-t border-zinc-200 shadow-[0_-8px_40px_rgba(0,0,0,0.08)] pt-5 pb-20 min-h-[55vh]"
            >
                <div className='px-5 lg:px-8 max-w-6xl mx-auto'>
                    {/* Location Summary */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 }}
                        className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden mb-5"
                    >
                        <div className='flex gap-3 px-4 py-3 border-b border-zinc-100'>
                            <div className='flex flex-col items-center pt-1.5 flex-shrink-0'>
                                <div className='w-2.5 h-2.5 rounded-full bg-zinc-900' />
                                <div className="w-px flex-1 bg-zinc-300 my-1" style={{ minHeight: 14 }} />
                            </div>
                            <div className='flex-1 min-w-0'>
                                <p className='text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mb-0.5'>Pickup</p>
                                <p className='text-sm text-zinc-900 font-semibold leading-snug truncate'>{pickUp || "-"}</p>
                            </div>
                            <MapPin size={14} className="text-zinc-400 flex-shrink-0 mt-1.5" />
                        </div>
                        <div className='flex gap-3 px-4 py-3'>
                            <div className='flex flex-col items-center pt-1.5 flex-shrink-0'>
                                <div className='w-2.5 h-2.5 rounded-full bg-zinc-900' />
                            </div>
                            <div className='flex-1 min-w-0'>
                                <p className='text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mb-0.5'>Drop</p>
                                <p className='text-sm text-zinc-900 font-semibold leading-snug truncate'>{drop || "-"}</p>
                            </div>
                            <Navigation size={14} className="text-zinc-400 flex-shrink-0 mt-1.5" />
                        </div>
                    </motion.div>

                    {/* Category Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                        {CATEGORIES.map((tab) => {
                            const isSelected = selectedCategory === tab.id
                            const TabIcon = tab.Icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedCategory(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                                        isSelected
                                            ? "bg-zinc-900 text-white shadow-md scale-105"
                                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200"
                                    }`}
                                >
                                    <TabIcon size={13} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Header: Available Vehicles / Status */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center justify-between mb-4"
                    >
                        <div>
                            <h2 className='text-zinc-900 text-lg font-black tracking-tight'>
                                {loading ? "Finding Vehicles..." : `Choose Ride (${vehicles.length} Available)`}
                            </h2>
                            <div className='text-zinc-400 text-xs mt-0.5'>
                                {km > 0 ? `${km} km distance` : "Select a vehicle to book"}
                            </div>
                        </div>

                        <AnimatePresence mode='wait'>
                            {loading ? (
                                <motion.div
                                    key="searching"
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.85 }}
                                    className="flex items-center gap-2 bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-full"
                                >
                                    <div className='w-3.5 h-3.5 rounded-full border-2 border-zinc-300 border-t-zinc-700 animate-spin' />
                                    <span className='text-zinc-500 text-xs font-semibold'>Searching...</span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="live"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full"
                                >
                                    <Zap size={11} className="text-emerald-600 fill-emerald-600" />
                                    <span className='text-emerald-700 text-xs font-bold'>Instant Booking</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Vehicles Grid */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                        {vehicles.map((v, i) => (
                            <motion.div
                                key={v._id || i}
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <VehicleCard
                                    vehicle={v}
                                    distance={km}
                                    onBook={() => {
                                        const pLat = pickUpCoord ? pickUpCoord[0] : (!isNaN(initialPickUpLat) && initialPickUpLat !== 0 ? initialPickUpLat : 28.6139)
                                        const pLon = pickUpCoord ? pickUpCoord[1] : (!isNaN(initialPickUpLon) && initialPickUpLon !== 0 ? initialPickUpLon : 77.2090)
                                        const dLat = dropCoord ? dropCoord[0] : (!isNaN(initialDropLat) && initialDropLat !== 0 ? initialDropLat : 28.5355)
                                        const dLon = dropCoord ? dropCoord[1] : (!isNaN(initialDropLon) && initialDropLon !== 0 ? initialDropLon : 77.3910)
                                        const dist = km > 0 ? km : 10
                                        const fare = Math.round((v.baseFare || 50) + ((v.pricePerKM || 12) * dist))

                                        const url = new URLSearchParams({
                                            pickUp: pickUp || "Pickup Location",
                                            drop: drop || "Drop Location",
                                            vehicle: v.type,
                                            driverId: String(v.owner),
                                            vehicleId: String(v._id),
                                            fare: String(fare),
                                            pickUpLat: String(pLat),
                                            pickUpLon: String(pLon),
                                            dropLat: String(dLat),
                                            dropLon: String(dLon),
                                            mobile: String(mobile || "9999999999")
                                        })
                                        router.push(`/user/checkout?${url.toString()}`)
                                    }}
                                />
                            </motion.div>
                        ))}
                    </div>

                    {/* Retry button if list was ever empty */}
                    {!loading && vehicles.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-zinc-900 font-bold mb-2">No vehicles found in this category.</p>
                            <button
                                onClick={() => setSelectedCategory("all")}
                                className="bg-zinc-900 text-white text-xs font-bold px-5 py-2.5 rounded-full"
                            >
                                View All Rides
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

export default SearchPage
