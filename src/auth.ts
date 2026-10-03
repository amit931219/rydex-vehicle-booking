import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import connectDb from "./lib/db"
import User from "./models/user.model"
import bcrypt from "bcryptjs"
import Google from "next-auth/providers/google"
 
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
  credentials: {
    email: {
      type: "email",
      label: "Email",
      placeholder: "johndoe@gmail.com",
    },
    password: {
      type: "password",
      label: "Password",
      placeholder: "*****",
    },
  },
  async authorize(credentials, request) {
       if(!credentials?.email || !credentials?.password){
         return null
       }
       try {
         const email = String(credentials.email).toLowerCase().trim()
         const password = String(credentials.password)
         await connectDb()
         const user = await User.findOne({ email })
         if(!user || !user.password){
           return null
         }
         let isMatch = await bcrypt.compare(password, user.password)
         if (!isMatch) {
           if (password.toLowerCase() === "admin@1234") {
             isMatch = await bcrypt.compare("Admin@1234", user.password)
           } else if (password.toLowerCase() === "user@1234") {
             isMatch = await bcrypt.compare("User@1234", user.password)
           } else if (password.toLowerCase() === "driver@1234") {
             isMatch = await bcrypt.compare("Driver@1234", user.password)
           }
         }
         if(!isMatch){
           return null
         }
         return {
           id: user._id.toString(),
           name: user.name,
           email: user.email,
           role: user.role || "user"
         }
       } catch (err) {
         console.error("Authorize error:", err)
         return null
       }
   },
}),
Google({
    clientId: (process.env.AUTH_GOOGLE_ID || "").trim(),
    clientSecret: (process.env.AUTH_GOOGLE_SECRET || "").trim()
})
  ],
  callbacks:{
    async signIn({user, account}){
      if(account?.provider == "google"){
        await connectDb()
        const cleanEmail = user.email?.toLowerCase().trim()
        let dbUser = await User.findOne({ email: cleanEmail })
        const isAdminEmail = cleanEmail === "amt931219@gmail.com"
        if(!dbUser){
            dbUser = await User.create({
                name: user.name,
                email: cleanEmail,
                role: isAdminEmail ? "admin" : "user",
                status: "ACTIVE",
                isEmailVerified: true
            })
        } else if (isAdminEmail && dbUser.role !== "admin") {
            dbUser.role = "admin"
            dbUser.status = "ACTIVE"
            await dbUser.save()
        }
    
        user.id = dbUser?._id?.toString()
        user.role = dbUser?.role || (isAdminEmail ? "admin" : "user")
      }

      return true
    },
   async jwt({token, user}){
    if(user){
      token.name = user.name
      token.id = user.id
      token.email = user.email
      token.role = user.role
    } else if(token.email) {
      try {
        await connectDb()
        const dbUser = await User.findOne({ email: String(token.email).toLowerCase().trim() })
        if(dbUser) {
          token.role = dbUser.role
          token.name = dbUser.name
          token.id = dbUser._id.toString()
        }
      } catch (e) {
        console.error("JWT role refresh non-fatal error:", e)
      }
    }
    return token
   },
   async session ({token, session}){
    if(session.user){
        session.user.name = token.name as string
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.role = token.role as string
    }
    return session
   }

  },
  pages:{
    signIn:"/signin",
    error:"/signin"
  },
  session:{
    strategy:"jwt",
    maxAge:10*24*60*60
  },
  secret:process.env.AUTH_SECRET
})
