import mongoose from "mongoose"

// Custom DNS fallback only on local non-production environments (e.g. Windows SRV issue)
if (process.env.NODE_ENV !== "production") {
    try {
        const dns = require("dns")
        dns.setServers(["8.8.8.8", "1.1.1.1"])
    } catch (e) {}
}

const ATLAS_DIRECT_URI = "mongodb://amt931219_db_user:qV1hWhjQaQLoEyNR@ac-qkyxtcq-shard-00-00.epk1isk.mongodb.net:27017,ac-qkyxtcq-shard-00-01.epk1isk.mongodb.net:27017,ac-qkyxtcq-shard-00-02.epk1isk.mongodb.net:27017/rydex?ssl=true&replicaSet=atlas-ndepop-shard-0&authSource=admin&retryWrites=true&w=majority"

const mongodbUrl = process.env.MONGODB_URL || ATLAS_DIRECT_URI

let cached = global.mongooseConn
if (!cached) {
    cached = global.mongooseConn = { conn: null, promise: null }
}

const doConnect = async (url: string) => {
    return mongoose.connect(url, {
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false,
    }).then(c => c.connection)
}

const connectDb = async () => {
    if (cached.conn) {
        return cached.conn
    }

    if (!cached.promise) {
        cached.promise = doConnect(mongodbUrl).catch(async (err: any) => {
            const msg = String(err?.message || "")
            if (msg.includes("querySrv") || msg.includes("ECONNREFUSED") || err?.code === "ECONNREFUSED") {
                console.warn("[MongoDB] SRV DNS resolution failed on local environment. Automatically connecting via direct replica set cluster...")
                return doConnect(ATLAS_DIRECT_URI)
            }
            throw err
        })
    }

    try {
        const conn = await cached.promise
        cached.conn = conn
        return conn
    } catch (error) {
        cached.promise = null
        console.error("MongoDB connection error:", error)
        throw error
    }
}

export default connectDb