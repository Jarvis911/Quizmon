import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { JwtPayload } from '../types/index.js';
import { BACKEND_URL } from './index.js';

const jwtOptions: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET as string,
};

// JWT Strategy - for protected routes
passport.use(
    new JwtStrategy(jwtOptions, async (payload: JwtPayload, done) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: payload.id },
            });

            if (user) {
                return done(null, user);
            }
            return done(null, false);
        } catch (error) {
            return done(error, false);
        }
    })
);

// Local Strategy - for login
passport.use(
    new LocalStrategy(
        {
            usernameField: 'username',
            passwordField: 'password',
        },
        async (username, password, done) => {
            try {
                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { username: username },
                            { email: username },
                        ],
                    },
                });

                if (!user) {
                    return done(null, false, { message: 'User not found' });
                }

                if (!user.password) {
                    return done(null, false, { message: 'Please use Google Login for this account' });
                }

                const isValidPassword = bcrypt.compareSync(password, user.password);
                if (!isValidPassword) {
                    return done(null, false, { message: 'Invalid password' });
                }

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);

// Google Strategy - for Google Login
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            callbackURL: BACKEND_URL + '/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0].value;
                if (!email) {
                    return done(new Error('No email found from Google profile'), false);
                }

                // Try to find user by googleId
                let user = await prisma.user.findUnique({
                    where: { googleId: profile.id },
                });

                if (!user) {
                    // Try to find user by email
                    user = await prisma.user.findUnique({
                        where: { email },
                    });

                    if (user) {
                        // Link Google account to existing user
                        user = await prisma.user.update({
                            where: { email },
                            data: { googleId: profile.id },
                        });
                    } else {
                        // Create new user
                        user = await prisma.user.create({
                            data: {
                                email,
                                username: profile.displayName || email.split('@')[0],
                                googleId: profile.id,
                            },
                        });

                        // Auto-create personal organization for the user
                        try {
                            const orgName = user.username ? `${user.username} Team` : "Personal Team";
                            const { createOrganization } = await import('../services/organizationService.js');
                            await createOrganization(orgName, user.id);
                        } catch (orgErr) {
                            console.error('[GoogleStrategy] Failed to create default org:', orgErr);
                        }
                    }
                }

                return done(null, user);
            } catch (error) {
                return done(error as Error, false);
            }
        }
    )
);

export default passport;
