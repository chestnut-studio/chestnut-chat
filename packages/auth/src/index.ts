import { createDb } from "@chestnut-chat/db";
import * as schema from "@chestnut-chat/db/schema/auth";
import { env } from "@chestnut-chat/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";

type SocialProvider = "github" | "google";

function hasProviderCredentials(provider: SocialProvider) {
  if (provider === "github") {
    return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  }

  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function getAuthProviderOptions() {
  return {
    socialProviders: {
      github: hasProviderCredentials("github"),
      google: hasProviderCredentials("google"),
    },
    callbackOrigin: env.CORS_ORIGIN,
    emailOtp: true,
  };
}

function getOtpSubject(type: string) {
  if (type === "email-verification") return "Verify your Chestnut Chat email";
  if (type === "forget-password") return "Reset your Chestnut Chat password";

  return "Your Chestnut Chat sign-in code";
}

async function sendEmailOtp({ email, otp, type }: { email: string; otp: string; type: string }) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    if (env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required to send email OTPs.");
    }

    console.log(`[email-otp] type=${type} email=${email} otp=${otp}`);
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const subject = getOtpSubject(type);
  const text = `Your Chestnut Chat verification code is ${otp}. It expires in 5 minutes.`;
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject,
    text,
    html: `<p>Your Chestnut Chat verification code is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function createAuth() {
  const db = createDb();
  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};

  if (hasProviderCredentials("github")) {
    socialProviders.github = {
      clientId: env.GITHUB_CLIENT_ID!,
      clientSecret: env.GITHUB_CLIENT_SECRET!,
    };
  }

  if (hasProviderCredentials("google")) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
    };
  }

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",

      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    socialProviders,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      emailOTP({
        sendVerificationOTP: sendEmailOtp,
      }),
    ],
  });
}

export const auth = createAuth();
