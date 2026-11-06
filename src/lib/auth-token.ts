import { createHash, randomBytes } from "node:crypto";
export const newAuthToken = () => randomBytes(32).toString("hex");
export const hashAuthToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const validAuthToken = (token: string) => /^[a-f0-9]{64}$/.test(token);
