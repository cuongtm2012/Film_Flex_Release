import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "../storage";

const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using scrypt with salt
 * 
 * @param password The plain text password to hash
 * @returns The hashed password with salt in format 'hash.salt'
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compares a supplied password against a stored password hash
 * 
 * @param supplied The plain text password to check
 * @param stored The stored password hash with salt
 * @returns boolean indicating if the passwords match
 */
export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Logs user activity for audit purposes
 * 
 * @param userId The ID of the user performing the action
 * @param activityType The type of activity performed
 * @param targetId Optional ID of the target resource
 * @param details Optional additional details about the activity
 * @param ipAddress Optional IP address from which the activity was performed
 */
export async function logUserActivity(userId: number, activityType: string, targetId?: number, details?: any, ipAddress?: string) {
  try {
    await storage.createUserActivity({
      userId,
      activityType,
      targetId: targetId || null,
      details: details ? JSON.stringify(details) : null,
      ipAddress: ipAddress || null,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error logging user activity:", error);
  }
}