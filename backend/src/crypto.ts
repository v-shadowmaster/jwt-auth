import bcrypt from "bcrypt";

export async function hashPassword(password: string) {
    return bcrypt.hash(password, 12);
}


export async function verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
}

export async function hashOpaqueToken(token: string) {
    return bcrypt.hash(token, 12);
}


export async function compareHashOpaqueToken(token: string, hash: string) {
    return bcrypt.compare(token, hash);
}