/**
 * Re-export registerRoutes from main routes module.
 * Split routers (health, elasticsearch, stream, search) are mounted inside routes.ts.
 */
export { registerRoutes } from "../routes.js";
