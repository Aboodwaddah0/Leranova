import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";
import { resolveOrganizationIdFromUser } from "../services/featureService.js";
import { isSubscriptionActive } from "../services/subscriptionService.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATH_PREFIXES = ["/api/auth", "/api/subscriptions"];

const isExemptPath = (originalUrl) =>
  EXEMPT_PATH_PREFIXES.some((prefix) => originalUrl.startsWith(prefix));

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("Authorization Header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (!SAFE_METHODS.has(req.method) && !isExemptPath(req.originalUrl)) {
      const organizationId = await resolveOrganizationIdFromUser(decoded);

      if (organizationId) {
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { trialEndsAt: true },
        });

        if (organization?.trialEndsAt && new Date(organization.trialEndsAt) <= new Date()) {
          const active = await isSubscriptionActive(organizationId);

          if (!active) {
            return res.status(403).json({
              message: "Your free trial has ended. Choose a plan to continue.",
              code: "TRIAL_EXPIRED",
            });
          }
        }
      }
    }

    next();
  } catch (error) {
    console.log("JWT Error:", error.message);
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};
