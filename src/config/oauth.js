import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';

const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
export const googleOAuthEnabled = Boolean(googleClientID && googleClientSecret);

if (googleOAuthEnabled) {
  passport.use(
    new GoogleStrategy.Strategy(
      {
        clientID: googleClientID,
        clientSecret: googleClientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          return done(null, profile);
        } catch (error) {
          console.error('Error in Google OAuth strategy:', error);
          return done(error);
        }
      }
    )
  );
}

passport.serializeUser((oauthProfile, done) => {
  done(null, oauthProfile.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    done(null, { id });
  } catch (error) {
    done(error);
  }
});

export default passport;
