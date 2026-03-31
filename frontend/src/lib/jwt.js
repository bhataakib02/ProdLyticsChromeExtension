import { SignJWT, jwtVerify } from "jose";

function secretKey() {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 16) return null;
    return new TextEncoder().encode(s);
}

export async function signUserJwt(userIdString) {
    const secret = secretKey();
    if (!secret) {
        throw new Error("JWT_SECRET is missing or too short (min 16 characters). Set it in .env.local and on Vercel.");
    }
    return new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userIdString)
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret);
}

export async function verifyUserJwt(token) {
    try {
        const secret = secretKey();
        if (!secret) return null;
        const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
        return payload;
    } catch {
        return null;
    }
}
