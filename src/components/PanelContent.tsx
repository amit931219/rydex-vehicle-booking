'use client'
import { Bike, Car, CheckCircle2, Clock, CreditCard, IndianRupee, Loader2, MessageCircle, Phone, Truck, User, Wallet } from 'lucide-react'
import React, { useState } from 'react'
import axios from 'axios'
import { AnimatePresence, motion } from "motion/react"
import RideChat from './RideChat'

const getVehicleIcon = (vehicleType?: string) => {
    switch (vehicleType?.toLowerCase()) {
        case 'bike':
            return <Bike size={18} className="text-white" />;
        case 'auto':
            return <Car size={18} className="text-white" />;
        case 'truck':
            return <Truck size={18} className="text-white" />;
        case 'loading':
        case 'car':
        default:
            return <Car size={18} className="text-white" />;
    }
};

interface PanelContentProps {
    isActive?: boolean;
    displayDistance?: number | string;
    displayEta?: number | string;
    cfg?: any;
    status?: string;
    booking?: any;
    paymentStatus?: any;
    canChat?: boolean;
    chatOpen?: boolean;
    onChatToggle?: () => void;
    currentRole?: string;
}

function PanelContent({
    isActive,
    displayDistance,
    displayEta,
    cfg,
    status,
    booking,
    paymentStatus,
    canChat,
    chatOpen,
    onChatToggle,
    currentRole
}: PanelContentProps) {
    const [paying, setPaying] = useState(false);
    const [currentPaymentStatus, setCurrentPaymentStatus] = useState<string>(booking?.paymentStatus || "pending");

    if (!booking) return null;

    const isUser = currentRole === "user";

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (typeof window === "undefined") {
                resolve(false);
                return;
            }
            if ((window as any).Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleRazorpayPayment = async () => {
        if (!booking?._id) return;
        setPaying(true);
        try {
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                alert("Failed to load Razorpay SDK. Please check your internet connection.");
                setPaying(false);
                return;
            }

            const { data } = await axios.post("/api/payment/create", {
                bookingId: booking._id
            });

            const paymentObject = new (window as any).Razorpay({
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TDUVzaQuoV56SK",
                amount: data.amount,
                currency: "INR",
                name: "RYDEX",
                description: "Ride Payment",
                order_id: data.orderId,
                prefill: {
                    name: booking?.user?.name || "Customer",
                    email: booking?.user?.email || "customer@rydex.com",
                    contact: booking?.userMobileNumber || "9999999999"
                },
                handler: async function (response: any) {
                    try {
                        const { data: verifyData } = await axios.post("/api/payment/verify", {
                            bookingId: booking._id,
                            ...response
                        });
                        setPaying(false);
                        if (verifyData.success) {
                            setCurrentPaymentStatus("paid");
                            booking.paymentStatus = "paid";
                            alert("Payment Successful! Your ride is now paid online.");
                        }
                    } catch (vErr) {
                        setPaying(false);
                        console.error("Verification error:", vErr);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setPaying(false);
                    }
                }
            });

            paymentObject.open();
        } catch (err: any) {
            console.error("Razorpay payment error:", err);
            setPaying(false);
            alert(err?.response?.data?.message || err?.message || "Payment initiation failed");
        }
    };
    const personName = isUser
        ? (booking?.driver?.name || "Driver")
        : (booking?.user?.name || "Customer");
    const personPhone = isUser
        ? (booking?.driverMobileNumber || booking?.driver?.mobileNumber)
        : (booking?.userMobileNumber);
    const personRoleLabel = isUser ? "RYDEX Driver" : "Customer";

    return (
        <div className='flex flex-col pt-5 pb-4 gap-3'>
            {/* Top ETA & Fare Stats */}
            {isActive && (
                <div className='mx-5 lg:mx-6 grid grid-cols-2 gap-2'>
                    <div className='bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center gap-3'>
                        <div className='w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0'>
                            <Clock size={16} className="text-zinc-600" />
                        </div>
                        <div>
                            <p className='text-[10px] text-zinc-400 uppercase tracking-wider font-semibold'>ETA</p>
                            <p className='text-lg font-black text-zinc-900 leading-none mt-0.5'>
                                {Math.round(Number(displayEta) || 0)} <span className='text-xs font-normal text-zinc-400 ml-0.5'>min</span>
                            </p>
                        </div>
                    </div>

                    <div className='bg-zinc-950 rounded-2xl p-4 flex items-center gap-3'>
                        <div className='w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0'>
                            <IndianRupee size={16} className="text-white" />
                        </div>
                        <div>
                            <p className='text-[10px] text-zinc-500 uppercase tracking-wider font-semibold'>Fare</p>
                            <p className='text-lg font-black text-white leading-none mt-0.5'>{booking.fare || "-"}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Prominent OTP / PIN Cards for Customer */}
            {isUser && booking.bookingStatus === "confirmed" && (
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className='mx-5 lg:mx-6 bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 border-2 border-amber-400 rounded-2xl p-4 shadow-sm'
                >
                    <div className='flex items-center justify-between gap-3'>
                        <div>
                            <div className='flex items-center gap-1.5 mb-1'>
                                <span className='w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse' />
                                <span className='text-[11px] font-black uppercase tracking-[0.2em] text-amber-900'>Pickup PIN / OTP</span>
                            </div>
                            <p className='text-xs text-amber-800 font-medium'>
                                Share this PIN with driver to start ride
                            </p>
                        </div>
                        <div className='bg-zinc-950 text-amber-400 font-mono text-2xl font-black px-4 py-2 rounded-xl tracking-[0.3em] shadow-md border border-amber-500/30 flex-shrink-0'>
                            {booking.pickUpOtp || "----"}
                        </div>
                    </div>
                </motion.div>
            )}

            {isUser && booking.bookingStatus === "started" && (
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className='mx-5 lg:mx-6 bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 shadow-sm'
                >
                    <div className='flex items-center justify-between gap-3'>
                        <div>
                            <div className='flex items-center gap-1.5 mb-1'>
                                <span className='w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse' />
                                <span className='text-[11px] font-black uppercase tracking-[0.2em] text-emerald-900'>Drop PIN / OTP</span>
                            </div>
                            <p className='text-xs text-emerald-800 font-medium'>
                                Share at destination to complete trip
                            </p>
                        </div>
                        <div className='bg-zinc-950 text-emerald-400 font-mono text-2xl font-black px-4 py-2 rounded-xl tracking-[0.3em] shadow-md border border-emerald-500/30 flex-shrink-0'>
                            {booking.dropOtp || "----"}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* OTP Reminder Cards for Driver */}
            {!isUser && booking.bookingStatus === "confirmed" && (
                <div className='mx-5 lg:mx-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 font-black flex items-center justify-center flex-shrink-0 text-sm'>
                        PIN
                    </div>
                    <div>
                        <p className='text-xs font-bold text-amber-900'>Pickup PIN Required</p>
                        <p className='text-xs text-amber-700 font-medium'>
                            Ask the customer for their 4-digit PIN upon arriving at pickup.
                        </p>
                    </div>
                </div>
            )}

            {!isUser && booking.bookingStatus === "started" && (
                <div className='mx-5 lg:mx-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-800 font-black flex items-center justify-center flex-shrink-0 text-sm'>
                        PIN
                    </div>
                    <div>
                        <p className='text-xs font-bold text-emerald-900'>Drop PIN Required</p>
                        <p className='text-xs text-emerald-700 font-medium'>
                            Ask the customer for their 4-digit PIN at the drop location to finish trip.
                        </p>
                    </div>
                </div>
            )}

            {/* Person Card (Driver for User, Customer for Driver) */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mx-5 lg:mx-6"
            >
                <div className='bg-zinc-950 rounded-2xl p-4 flex items-center gap-4'>
                    <div className='relative flex-shrink-0'>
                        <div className='w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center'>
                            <User size={26} className="text-zinc-300" />
                        </div>
                        <div className='absolute -bottom-1 -right-1 bg-emerald-400 w-4 h-4 rounded-full border-2 border-zinc-950' />
                    </div>
                    <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between gap-2'>
                            <p className='text-white font-bold text-base truncate'>{personName}</p>
                            <div className='flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full flex-shrink-0'>
                                <IndianRupee size={10} className="text-amber-400" />
                                <span className='text-white text-xs font-semibold'>{booking.fare}</span>
                            </div>
                        </div>

                        <div className='flex items-center gap-2 mt-1'>
                            <span className='text-[10px] text-zinc-400 font-medium'>{personRoleLabel}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                    (currentPaymentStatus === "paid" || booking?.paymentStatus === "paid")
                                        ? "bg-emerald-100 text-emerald-700"
                                        : (currentPaymentStatus === "cash" || booking?.paymentStatus === "cash")
                                            ? "bg-zinc-100 text-zinc-700"
                                            : "bg-amber-100 text-amber-700"
                                }`}>
                                    {(currentPaymentStatus === "paid" || booking?.paymentStatus === "paid") ? "Paid" : ((currentPaymentStatus === "cash" || booking?.paymentStatus === "cash") ? "Cash" : "Pending")}
                                </span>
                        </div>
                    </div>
                </div>

                {isActive && (
                    <div className='flex gap-2 mt-2'>
                        {personPhone && (
                            <a
                                href={`tel:${personPhone}`}
                                className={`flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 active:scale-[0.97] transition-all text-zinc-900 py-3 rounded-xl text-sm font-semibold ${canChat ? "flex-1" : "w-full"}`}
                            >
                                <Phone size={15} /> Call
                            </a>
                        )}
                        {canChat && (
                            <button
                                onClick={onChatToggle}
                                className={`flex-1 flex items-center justify-center gap-2 active:scale-[0.97] transition-all py-3 rounded-xl text-sm font-semibold ${chatOpen ? "bg-zinc-200 text-zinc-900" : "bg-zinc-900 hover:bg-zinc-800 text-white"}`}
                            >
                                <MessageCircle size={15} />
                                {chatOpen ? "Close Chat" : "Message"}
                            </button>
                        )}
                    </div>
                )}

                {/* Pay Online via Razorpay for Customer */}
                {isUser && isActive && currentPaymentStatus !== "paid" && booking?.paymentStatus !== "paid" && (
                    <div className="mt-2.5">
                        <button
                            type="button"
                            onClick={handleRazorpayPayment}
                            disabled={paying}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md active:scale-[0.98] transition-all"
                        >
                            {paying ? (
                                <Loader2 size={15} className="animate-spin" />
                            ) : (
                                <>
                                    <Wallet size={15} />
                                    <span>Pay ₹{booking.fare} Online via Razorpay</span>
                                </>
                            )}
                        </button>
                        <p className="text-[10px] text-zinc-400 text-center mt-1">UPI · Credit/Debit Card · Netbanking</p>
                    </div>
                )}

                {(currentPaymentStatus === "paid" || booking?.paymentStatus === "paid") && (
                    <div className="mt-2.5 flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs py-2.5 px-4 rounded-xl">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        <span>Ride Paid Online via Razorpay</span>
                    </div>
                )}
            </motion.div>

            {/* In-Ride Chat */}
            <AnimatePresence>
                {chatOpen && canChat && (
                    <motion.div
                        key="chat"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="mx-5 lg:mx-6 overflow-hidden"
                    >
                        <div className='rounded-2xl overflow-hidden border border-zinc-100 h-[460px]'>
                            <RideChat
                                currentRole={currentRole}
                                bookingId={booking._id}
                                userName={booking?.user?.name || "Customer"}
                                driverName={booking?.driver?.name || "Driver"}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Vehicle Card */}
            {booking?.vehicle && (
                <div className='mx-5 lg:mx-6'>
                    <div className='bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center gap-3'>
                        <div className='w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0'>
                            {getVehicleIcon(booking.vehicle.type)}
                        </div>
                        <div className='flex-1 min-w-0'>
                            <p className='text-[10px] text-zinc-400 uppercase tracking-wider font-semibold'>Assigned Vehicle</p>
                            <p className='text-sm font-bold text-zinc-900 truncate'>{booking.vehicle.vehicleModel ?? "Vehicle"}</p>
                        </div>
                        <div className='flex-shrink-0 bg-zinc-900 px-3 py-1.5 rounded-lg'>
                            <p className='text-white text-xs font-black tracking-widest font-mono'>{booking.vehicle.number ?? "NUMBER"}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Route Addresses */}
            <div className='mx-5 lg:mx-6'>
                <div className='bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden'>
                    <div className='flex gap-3 p-4 border-b border-zinc-100'>
                        <div className='flex flex-col items-center flex-shrink-0 pt-1'>
                            <div className='w-3 h-3 rounded-full bg-zinc-900 border-2 border-white shadow-sm' />
                            <div className='w-px bg-zinc-200 mt-1 h-5' />
                        </div>
                        <div className='flex-1 min-w-0'>
                            <p className='text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5'>PickUp</p>
                            <p className='text-sm text-zinc-800 leading-snug'>{booking?.pickUpAddress}</p>
                        </div>
                    </div>
                    <div className='flex gap-3 p-4'>
                        <div className='flex flex-col items-center flex-shrink-0 pt-1'>
                            <div className='w-3 h-3 rounded-full bg-zinc-900 border-2 border-white shadow-sm' />
                        </div>
                        <div className='flex-1 min-w-0'>
                            <p className='text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5'>Drop</p>
                            <p className='text-sm text-zinc-800 leading-snug'>{booking?.dropAddress}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PanelContent
