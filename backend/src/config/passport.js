// src/config/passport.js
//
// Google OAuth 2.0 strategy. Stateless (JWT-cookie) auth is used app-wide, so
// routes should call passport.authenticate("google", { session: false }) and
// issue the JWT cookie themselves (Part B). serialize/deserialize are provided
// defensively in case session mode is ever enabled.

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userModel from "../models/userModel.js";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } =
  process.env;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value
            ? String(profile.emails[0].value).toLowerCase()
            : undefined;
          const name =
            profile.displayName ||
            (email ? email.split("@")[0] : "Utilisateur");
          const avatar = profile.photos?.[0]?.value;

          // 1) Existing Google-linked account
          let user = await userModel.findOne({ googleId });
          if (user) return done(null, user);

          // 2) Existing email account -> link Google to it
          if (email) {
            user = await userModel.findOne({ email });
            if (user) {
              user.googleId = googleId;
              if (!user.avatar && avatar) user.avatar = avatar;
              user.isVerified = true; // Google has verified this email
              await user.save();
              return done(null, user);
            }
          }

          // 3) New account (verified, since Google verified the email)
          user = await userModel.create({
            name,
            email,
            googleId,
            avatar,
            isVerified: true,
            role: "user",
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn(
    "[passport] Google OAuth not configured (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL). Skipping strategy registration."
  );
}

// Defensive session support (unused with session: false).
passport.serializeUser((user, done) => {
  done(null, user._id ? user._id.toString() : user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user || false);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
