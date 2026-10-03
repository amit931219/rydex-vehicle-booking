'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/')
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="p-6 text-center">
                <p className="text-sm text-gray-600">Redirecting to Rydex...</p>
            </div>
        </div>
    )
}
