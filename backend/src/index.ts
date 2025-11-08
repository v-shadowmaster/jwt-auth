import express, { Request, Response } from "express";
import CookiePaser from "cookie-parser";
import { z } from "zod";
import { prisma } from "./db";
import { compareHashOpaqueToken, hashOpaqueToken, hashPassword, verifyPassword } from "./crypto";
import { signAccessToken, signRefreshToken, verifyJwt } from "./jwt";
import crypto from "crypto";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.post("/auth/register", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return res.status(409).json({ error: "Email already exists FUCK OFF BITCH" });


    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, passwordHash } });


    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    res.cookie("rt", refreshToken, { httpOnly: true });
    res.json({ accessToken, user: { id: user.id, email: user.email } });
})


app.get('/read-cookies', (req, res) => {

    console.log(req.cookies);
    res.send("ok"); // This will show all cookies sent by the client
});

app.listen("5000", () => console.log("server started"));



