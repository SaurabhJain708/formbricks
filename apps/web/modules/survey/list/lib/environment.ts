import "server-only";
import { validateInputs } from "@/lib/utils/validate";
import { Environment, Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { z } from "zod";
import { prisma } from "@formbricks/database";
import { logger } from "@formbricks/logger";
import { DatabaseError, ResourceNotFoundError } from "@formbricks/types/errors";

export const doesEnvironmentExist = reactCache(async (environmentId: string): Promise<string | null> => {
  const environment = await prisma.environment.findUnique({
    where: {
      id: environmentId,
    },
    select: {
      id: true,
    },
  });

  if (!environment) {
    throw new ResourceNotFoundError("Environment", environmentId);
  }

  return environment.id;
});

export const getProjectIdIfEnvironmentExists = reactCache(
  async (environmentId: string): Promise<string | null> => {
    const environment = await prisma.environment.findUnique({
      where: {
        id: environmentId,
      },
      select: {
        projectId: true,
      },
    });

    if (!environment) {
      throw new ResourceNotFoundError("Environment", environmentId);
    }

    return environment.projectId;
  }
);

export const getEnvironment = reactCache(
  async (environmentId: string): Promise<Pick<Environment, "id" | "type"> | null> => {
    validateInputs([environmentId, z.string().cuid2()]);

    try {
      const environment = await prisma.environment.findUnique({
        where: {
          id: environmentId,
        },
        select: {
          id: true,
          type: true,
        },
      });
      return environment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error(error, "Error fetching environment");
        throw new DatabaseError(error.message);
      }

      throw error;
    }
  }
);
