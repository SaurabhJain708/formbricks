import { createCacheKey, withCache } from "@/modules/cache/lib/withCache";
import { PostHog } from "posthog-node";
import { logger } from "@formbricks/logger";
import { TOrganizationBillingPlan, TOrganizationBillingPlanLimits } from "@formbricks/types/organizations";
import { IS_POSTHOG_CONFIGURED, IS_PRODUCTION, POSTHOG_API_HOST, POSTHOG_API_KEY } from "./constants";

const enabled = IS_PRODUCTION && IS_POSTHOG_CONFIGURED;

export const capturePosthogEnvironmentEvent = async (
  environmentId: string,
  eventName: string,
  properties: any = {}
) => {
  if (!enabled || typeof POSTHOG_API_HOST !== "string" || typeof POSTHOG_API_KEY !== "string") {
    return;
  }
  try {
    const client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_API_HOST,
    });
    client.capture({
      // workaround with a static string as exaplained in PostHog docs: https://posthog.com/docs/product-analytics/group-analytics
      distinctId: "environmentEvents",
      event: eventName,
      groups: { environment: environmentId },
      properties,
    });
    await client.shutdown();
  } catch (error) {
    logger.error(error, "error sending posthog event");
  }
};

export const sendPlanLimitsReachedEventToPosthogWeekly = (
  environmentId: string,
  billing: {
    plan: TOrganizationBillingPlan;
    limits: TOrganizationBillingPlanLimits;
  }
) =>
  withCache(
    async () => {
      try {
        await capturePosthogEnvironmentEvent(environmentId, "plan limit reached", {
          ...billing,
        });
        return "success";
      } catch (error) {
        logger.error(error, "error sending plan limits reached event to posthog weekly");
        throw error;
      }
    },
    {
      key: createCacheKey.custom("analytics", environmentId, `plan_limits_${billing.plan}`),
      ttl: 60 * 60 * 24 * 7 * 1000, // 7 days in milliseconds
    }
  )();
