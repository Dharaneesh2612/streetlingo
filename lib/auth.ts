import NextAuth from "next-auth";
import Google  from "next-auth/providers/google";
import { connectDB } from "@/lib/db/connect";
import User from "@/lib/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    /* Persist MongoDB _id into the JWT so we can use it in API routes */
    async jwt({ token, user }) {
      if (user?.email) {
        try {
          await connectDB();
          const dbUser = await User.findOneAndUpdate(
            { email: user.email },
            {
              $setOnInsert: {
                name:      user.name  ?? "User",
                email:     user.email,
                image:     user.image ?? "",
                createdAt: new Date(),
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ).lean();
          token.userId = (dbUser as { _id: { toString(): string } })?._id?.toString() ?? "";
        } catch {
          /* DB unavailable — auth still works, just no userId */
        }
      }
      return token;
    },

    /* Expose userId to the client session */
    async session({ session, token }) {
      if (token.userId) {
        (session.user as { userId?: string }).userId = token.userId as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
});
