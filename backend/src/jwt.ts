import jwt from "jsonwebtoken";
require('dotenv').config();

const SECRET = "super_long_random_string_for_hs256"


export function signAccessToken(userId: string): string {
    // @ts-ignore
    return jwt.sign({ sub: userId }, SECRET, { expiresIn: '15m' });
}


export function signRefreshToken(userId: string): string {
    // @ts-ignore
    return jwt.sign({ sub: userId }, SECRET, { expiresIn: '30d' });
}

function verifyToken(token: string) {
    return jwt.verify(token, SECRET);
}
