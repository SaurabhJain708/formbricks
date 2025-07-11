import { ZWebhookUpdateSchema } from "@/modules/api/v2/management/webhooks/[webhookId]/types/webhooks";
import { ApiErrorResponseV2 } from "@/modules/api/v2/types/api-error";
import { Prisma, Webhook } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@formbricks/database";
import { PrismaErrorType } from "@formbricks/database/types/error";
import { Result, err, ok } from "@formbricks/types/error-handlers";

export const getWebhook = async (webhookId: string) => {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: {
        id: webhookId,
      },
    });

    if (!webhook) {
      return err({
        type: "not_found",
        details: [{ field: "webhook", issue: "not found" }],
      });
    }

    return ok(webhook);
  } catch (error) {
    return err({
      type: "internal_server_error",
      details: [{ field: "webhook", issue: error.message }],
    });
  }
};

export const updateWebhook = async (
  webhookId: string,
  webhookInput: z.infer<typeof ZWebhookUpdateSchema>
): Promise<Result<Webhook, ApiErrorResponseV2>> => {
  try {
    const updatedWebhook = await prisma.webhook.update({
      where: {
        id: webhookId,
      },
      data: webhookInput,
    });

    return ok(updatedWebhook);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === PrismaErrorType.RecordDoesNotExist ||
        error.code === PrismaErrorType.RelatedRecordDoesNotExist
      ) {
        return err({
          type: "not_found",
          details: [{ field: "webhook", issue: "not found" }],
        });
      }
    }
    return err({
      type: "internal_server_error",
      details: [{ field: "webhook", issue: error.message }],
    });
  }
};

export const deleteWebhook = async (webhookId: string): Promise<Result<Webhook, ApiErrorResponseV2>> => {
  try {
    const deletedWebhook = await prisma.webhook.delete({
      where: {
        id: webhookId,
      },
    });

    return ok(deletedWebhook);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === PrismaErrorType.RecordDoesNotExist ||
        error.code === PrismaErrorType.RelatedRecordDoesNotExist
      ) {
        return err({
          type: "not_found",
          details: [{ field: "webhook", issue: "not found" }],
        });
      }
    }
    return err({
      type: "internal_server_error",
      details: [{ field: "webhook", issue: error.message }],
    });
  }
};
