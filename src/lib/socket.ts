import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

export const getSocket = (): Socket => {
    if (!socket) {
        const url = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:8000"
        socket = io(url, {
            reconnectionAttempts: 5,
            timeout: 10000,
            transports: ["websocket", "polling"],
        })
    }
    return socket
}
