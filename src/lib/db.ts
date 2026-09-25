import mongoose from "mongoose"

// Custom DNS fallback only on local non-production environments (e.g. Windows SRV issue)
if (process.env.NODE_ENV !== "production") {
    try {
        const dns = require("dns")
        dns.setServers(["8.8.8.8", "1.1.1.1"])
    } catch (e) {}
}

const mongodbUrl=process.env.MONGODB_URL

if(!mongodbUrl){
    throw new Error("db url not found!")
}

let cached=global.mongooseConn
if(!cached){
    cached=global.mongooseConn={conn:null,promise:null}
}

const connectDb=async () => {
    if(cached.conn){
        return cached.conn
    }

    if(!cached.promise){
        cached.promise=mongoose.connect(mongodbUrl, {
            serverSelectionTimeoutMS: 7000,
            bufferCommands: false,
        }).then(c=>c.connection)
    }

    try {
        const conn=await cached.promise
        cached.conn=conn
        return conn
    } catch (error) {
        cached.promise=null
        console.error("MongoDB connection error:", error)
        throw error
    }
}

export default connectDb