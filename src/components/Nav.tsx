'use client'
import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from "motion/react"
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import AuthModal from './AuthModal'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/redux/store'
import { Bike, Car, ChevronRight, LogOut, Truck } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { setUserData } from '@/redux/userSlice'
import axios from 'axios'
import { getSocket } from '@/lib/socket'

function Nav() {
    const pathName = usePathname()
    const [authOpen, setAuthOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const { userData } = useSelector((state: RootState) => state.user)
    const [pendingCount, setPendingCount] = useState(0)
    const dispatch = useDispatch<AppDispatch>()
    const router = useRouter()

    const handleLogOut = async () => {
        await signOut({ redirect: false })
        dispatch(setUserData(null))
        setProfileOpen(false)
        window.location.href = "/"
    }

    const handleSwitchRole = async (targetRole?: "user" | "partner") => {
        try {
            const nextRole = targetRole || (userData?.role === "partner" ? "user" : "partner")
            await axios.post("/api/user/switch-role", { targetRole: nextRole })
            setProfileOpen(false)
            window.location.href = "/"
        } catch (error) {
            console.error("switch role error:", error)
        }
    }

    const fetchCount = async () => {
        try {
            const { data } = await axios.get("/api/partner/bookings/pending-requests-count")
            setPendingCount(data)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        if (userData?.role === "partner") {
            fetchCount()
        }
    }, [userData?.role])

    useEffect(() => {
        const socket = getSocket()
        socket.on("new-booking", () => {
            setPendingCount(prev => prev + 1)
        })
        return () => {
            socket.off("new-booking")
        }
    }, [])

    return (
        <>
            <motion.div
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`fixed top-3 left-1/2 -translate-x-1/2
        w-[94%] md:w-[86%]
        z-50 rounded-full bg-[#0B0B0B] text-white
        shadow-[0_15px_50px_rgba(0,0,0,0.7)] py-3`}
            >
                <div className='max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between'>
                    <Link href="/" className="flex items-center gap-2 cursor-pointer">
                        <Image src={"/logo.png"} alt='logo' width={44} height={44} priority />
                    </Link>

                    <div className='hidden md:flex items-center gap-8'>
                        {userData?.role === "partner" ? (
                            <>
                                <Link className="relative text-sm font-medium text-gray-300 hover:text-white transition" href={"/"}>Dashboard</Link>
                                <Link className="relative text-sm font-medium text-gray-300 hover:text-white transition" href={"/partner/pending-requests"}>
                                    Pending Requests
                                    <span className="absolute -top-2 -right-5 w-6 h-6 bg-white text-black text-xs rounded-full flex items-center justify-center font-bold">{pendingCount ?? 0}</span>
                                </Link>
                                <Link className="relative text-sm font-medium text-gray-300 hover:text-white transition" href={"/partner/bookings"}>Bookings</Link>
                                <Link className="relative text-sm font-medium text-gray-300 hover:text-white transition" href={"/partner/active-ride"}>Active Ride</Link>
                            </>
                        ) : (
                            <>
                                <Link className="relative text-sm font-medium text-gray-300 hover:text-white transition" href={"/"}>Book a Ride</Link>
                                {userData && (
                                    <Link className="relative text-sm font-medium text-gray-300 hover:text-white transition" href={"/user/bookings"}>My Rides</Link>
                                )}
                                <Link className="relative text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition flex items-center gap-1.5" href={"/partner/onboarding/vehicle"}>
                                    <div className='flex -space-x-1'>
                                        <div className='w-4 h-4 rounded-full bg-white text-black flex items-center justify-center'><Bike size={10} /></div>
                                        <div className='w-4 h-4 rounded-full bg-white text-black flex items-center justify-center'><Car size={10} /></div>
                                    </div>
                                    <span>Become a Partner</span>
                                </Link>
                            </>
                        )}
                    </div>

                    <div className='flex items-center gap-3 relative'>
                        <div className='hidden md:block relative'>
                            {!userData ? (
                                <button
                                    className='px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium hover:bg-gray-100 transition cursor-pointer'
                                    onClick={() => setAuthOpen(true)}
                                >
                                    Login
                                </button>
                            ) : (
                                <>
                                    <button
                                        className='w-11 h-11 rounded-full bg-white text-black font-bold flex items-center justify-center cursor-pointer hover:bg-gray-100 transition'
                                        onClick={() => setProfileOpen(p => !p)}
                                    >
                                        {userData.name.charAt(0).toUpperCase()}
                                    </button>

                                    <AnimatePresence>
                                        {profileOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-14 right-0 w-[300px] bg-white text-black rounded-2xl shadow-xl border overflow-hidden"
                                            >
                                                <div className='p-5'>
                                                    <div className='flex items-center justify-between mb-3 pb-3 border-b'>
                                                        <div>
                                                            <p className='font-semibold text-base'>{userData.name}</p>
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${userData.role === "partner" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                                                                {userData.role === "partner" ? "Driver / Partner" : "Customer / Rider"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {userData.role !== "partner" ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleSwitchRole("partner")}
                                                                className='w-full flex items-center justify-between p-2.5 rounded-xl bg-black text-white hover:bg-gray-800 text-xs font-semibold transition cursor-pointer mb-2'
                                                            >
                                                                <span>⚡ Switch to Driver Mode</span>
                                                                <ChevronRight size={14} />
                                                            </button>

                                                            <div className='w-full flex items-center gap-3 pl-3 pb-3 pt-3 hover:bg-gray-100 rounded-xl cursor-pointer text-sm font-medium' onClick={() => { setProfileOpen(false); router.push("/user/bookings"); }}>
                                                                My Bookings
                                                                <ChevronRight size={16} className='ml-auto' />
                                                            </div>

                                                            <div className='w-full flex items-center gap-3 py-3 px-3 hover:bg-gray-100 rounded-xl cursor-pointer text-sm font-medium' onClick={() => { setProfileOpen(false); router.push("/partner/onboarding/vehicle"); }}>
                                                                <div className='flex -space-x-2'>
                                                                    <div className='w-6 h-6 rounded-full bg-black text-white flex items-center justify-center'> <Bike size={14} /></div>
                                                                    <div className='w-6 h-6 rounded-full bg-black text-white flex items-center justify-center'><Car size={14} /></div>
                                                                    <div className='w-6 h-6 rounded-full bg-black text-white flex items-center justify-center'><Truck size={14} /></div>
                                                                </div>
                                                                Become a Partner
                                                                <ChevronRight size={16} className='ml-auto' />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className='flex flex-col gap-1 border-b pb-3 mb-2'>
                                                            <button
                                                                onClick={() => handleSwitchRole("user")}
                                                                className='w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-900 transition cursor-pointer mb-2'
                                                            >
                                                                <span>🚗 Switch to Customer Mode</span>
                                                                <ChevronRight size={14} />
                                                            </button>

                                                            <Link className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 text-sm font-medium" href={"/partner/pending-requests"} onClick={() => setProfileOpen(false)}>
                                                                <span>Pending Requests</span>
                                                                <span className="w-5 h-5 bg-black text-white text-xs rounded-full flex items-center justify-center font-bold">{pendingCount ?? 0}</span>
                                                            </Link>
                                                            <Link className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 text-sm font-medium" href={"/partner/bookings"} onClick={() => setProfileOpen(false)}>
                                                                <span>Partner Bookings</span>
                                                            </Link>
                                                            <Link className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 text-sm font-medium" href={"/partner/active-ride"} onClick={() => setProfileOpen(false)}>
                                                                <span>Active Ride</span>
                                                            </Link>
                                                        </div>
                                                    )}

                                                    <button className='w-full flex items-center gap-3 py-3 hover:bg-gray-100 rounded-xl mt-2 cursor-pointer text-sm font-medium text-red-600' onClick={handleLogOut}>
                                                        <LogOut size={16} />
                                                        Logout
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </div>

                        <div className='md:hidden'>
                            {!userData ? (
                                <button
                                    className='px-4 py-1.5 rounded-full bg-white text-black text-sm cursor-pointer'
                                    onClick={() => setAuthOpen(true)}
                                >
                                    Login
                                </button>
                            ) : (
                                <button
                                    className='w-11 h-11 rounded-full bg-white text-black font-bold cursor-pointer'
                                    onClick={() => setProfileOpen(p => !p)}
                                >
                                    {userData.name.charAt(0).toUpperCase()}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {profileOpen && userData && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setProfileOpen(false)}
                            className="fixed inset-0 bg-black z-30 md:hidden"
                        />
                        <motion.div
                            initial={{ y: 400 }}
                            animate={{ y: 0 }}
                            exit={{ y: 400 }}
                            transition={{ type: "spring", damping: 25 }}
                            className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 md:hidden"
                        >
                            <div className='p-5'>
                                <div className='flex items-center justify-between mb-4 pb-3 border-b'>
                                    <div>
                                        <p className='font-semibold text-lg'>{userData.name}</p>
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${userData.role === "partner" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                                            {userData.role === "partner" ? "Driver / Partner" : "Customer / Rider"}
                                        </span>
                                    </div>
                                </div>

                                {userData.role !== "partner" ? (
                                    <>
                                        <button
                                            onClick={() => handleSwitchRole("partner")}
                                            className='w-full flex items-center justify-between p-3 rounded-xl bg-black text-white hover:bg-gray-800 text-sm font-semibold transition cursor-pointer mb-3'
                                        >
                                            <span>⚡ Switch to Driver Mode</span>
                                            <ChevronRight size={16} />
                                        </button>

                                        <div className='w-full flex items-center gap-3 pt-3 pb-3 pl-3 hover:bg-gray-100 rounded-xl cursor-pointer text-sm font-medium' onClick={() => { setProfileOpen(false); router.push("/user/bookings"); }}>
                                            My Bookings
                                            <ChevronRight size={16} className='ml-auto' />
                                        </div>
                                        <div className='w-full flex items-center gap-3 py-3 px-3 hover:bg-gray-100 rounded-xl cursor-pointer text-sm font-medium' onClick={() => { setProfileOpen(false); router.push("/partner/onboarding/vehicle"); }}>
                                            <div className='flex -space-x-2'>
                                                <div className='w-6 h-6 rounded-full bg-black text-white flex items-center justify-center'> <Bike size={14} /></div>
                                                <div className='w-6 h-6 rounded-full bg-black text-white flex items-center justify-center'><Car size={14} /></div>
                                                <div className='w-6 h-6 rounded-full bg-black text-white flex items-center justify-center'><Truck size={14} /></div>
                                            </div>
                                            Become a Partner
                                            <ChevronRight size={16} className='ml-auto' />
                                        </div>
                                    </>
                                ) : (
                                    <div className='flex flex-col gap-3 border-b pb-3 mb-2'>
                                        <button
                                            onClick={() => handleSwitchRole("user")}
                                            className='w-full flex items-center justify-between p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-900 transition cursor-pointer mb-2'
                                        >
                                            <span>🚗 Switch to Customer Mode</span>
                                            <ChevronRight size={16} />
                                        </button>

                                        <Link className="relative text-sm font-medium text-black hover:text-gray-500 transition flex items-center justify-between" href={"/partner/pending-requests"} onClick={() => setProfileOpen(false)}>
                                            <span>Pending Requests</span>
                                            <span className="w-6 h-6 bg-black text-white text-xs rounded-full flex items-center justify-center font-bold">{pendingCount ?? 0}</span>
                                        </Link>
                                        <Link className="relative text-sm font-medium text-black hover:text-gray-500 transition" href={"/partner/bookings"} onClick={() => setProfileOpen(false)}>Bookings</Link>
                                        <Link className="relative text-sm font-medium text-black hover:text-gray-500 transition" href={"/partner/active-ride"} onClick={() => setProfileOpen(false)}>Active Ride</Link>
                                    </div>
                                )}

                                <button className='w-full flex items-center gap-3 py-3 hover:bg-gray-100 rounded-xl mt-2 cursor-pointer text-sm font-medium text-red-600' onClick={handleLogOut}>
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </>
    )
}

export default Nav
