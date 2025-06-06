import { responses } from "@/app/lib/api/response";
import { CRON_SECRET } from "@/lib/constants";
import { headers } from "next/headers";
import { prisma } from "@formbricks/database";

export const POST = async () => {
  const headersList = await headers();
  const apiKey = headersList.get("x-api-key");

  if (!apiKey || apiKey !== CRON_SECRET) {
    return responses.notAuthenticatedResponse();
  }

  // close surveys that are in progress and have a closeOnDate in the past
  const surveysToClose = await prisma.survey.findMany({
    where: {
      status: "inProgress",
      closeOnDate: {
        lte: new Date(),
      },
    },
    select: {
      id: true,
      environmentId: true,
    },
  });

  if (surveysToClose.length) {
    await prisma.survey.updateMany({
      where: {
        id: {
          in: surveysToClose.map((survey) => survey.id),
        },
      },
      data: {
        status: "completed",
      },
    });
  }

  // run surveys that are scheduled and have a runOnDate in the past
  const scheduledSurveys = await prisma.survey.findMany({
    where: {
      status: "scheduled",
      runOnDate: {
        lte: new Date(),
      },
    },
    select: {
      id: true,
      environmentId: true,
    },
  });

  if (scheduledSurveys.length) {
    await prisma.survey.updateMany({
      where: {
        id: {
          in: scheduledSurveys.map((survey) => survey.id),
        },
      },
      data: {
        status: "inProgress",
      },
    });
  }

  return responses.successResponse({
    message: `Updated ${surveysToClose.length} surveys to completed and ${scheduledSurveys.length} surveys to inProgress.`,
  });
};
