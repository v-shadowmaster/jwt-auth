import express from "express";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import * as crypto from 'crypto';
dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

/**
 * In-memory example stores (replace with DB in production)
 */

type User = { id: string; username: string; passwordHash: string; role?: string };
const users = new Map<string, User>();
const refreshTokenStore = new Map<string, { userId: string; tokenHash: string; expiresAt: number; replacedBy?: string; revoked?: boolean }>();

/** Utility: create hashes and compare */
const hash = (s: string) => bcrypt.hashSync(s, 10);
const compare = (s: string, hash: string) => bcrypt.compareSync(s, hash);

/** Bootstrapping a demo user */
const demoPassword = 'Password123!';
const demoUser: User = { id: 'user-1', username: 'vini', passwordHash: hash(demoPassword), role: 'user' };
users.set(demoUser.username, demoUser);

/** Token helpers */
const signAccessToken = (userId: string, role?: string) => {
    // @ts-expect-error
    return jwt.sign({ sub: userId, role }, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' });
};

const signRefreshToken = (userId: string) => {
    // We'll use an opaque refresh token (UUID) and store its hash server-side
    const token = uuidv4() + '-' + cryptoRandomBase64(32);
    return token;
};

function cryptoRandomBase64(lenBytes = 32) {
    const buf = crypto.randomBytes(lenBytes); // <-- 2. Use the imported crypto module
    return buf.toString('base64url');
}

/** Secure cookie options for refresh token */
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/refresh-token', // only send cookie to refresh endpoint (narrow scope)
};


/** LOGIN */
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.get(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!compare(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccessToken(user.id, user.role);

    // create refresh token and store hashed value
    const refreshToken = signRefreshToken(user.id);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = Date.now() + msToMillis(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');

    refreshTokenStore.set(refreshToken, { userId: user.id, tokenHash: refreshTokenHash, expiresAt });

    // send access token in body (or cookie) and refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: expiresAt - Date.now() });
    res.json({ accessToken });
});


/** helper to parse something like '7d' into millis */
function msToMillis(str: string) {
    // minimal parser: supports '15m', '7d', '1h'
    const m = str.match(/^(\d+)(s|m|h|d)$/);
    if (!m) return 0;
    const n = Number(m[1]);
    const unit = m[2];
    switch (unit) {
        case 's': return n * 1000;
        case 'm': return n * 60 * 1000;
        case 'h': return n * 60 * 60 * 1000;
        case 'd': return n * 24 * 60 * 60 * 1000;
        default: return 0;
    }
}


app.listen(process.env.PORT || 4000, () => {
    console.log('Server running on port', process.env.PORT || 4000);
});