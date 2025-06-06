import { getEnvironment } from "@/lib/environment/service";
import { getOrganizationByEnvironmentId } from "@/lib/organization/service";
import { getContactAttributes } from "@/modules/ee/contacts/api/v1/client/[environmentId]/identify/contacts/[userId]/lib/attributes";
import { getContactByUserId } from "@/modules/ee/contacts/api/v1/client/[environmentId]/identify/contacts/[userId]/lib/contact";
import { getPersonSegmentIds } from "@/modules/ee/contacts/api/v1/client/[environmentId]/user/lib/segments";
import { prisma } from "@formbricks/database";
import { ResourceNotFoundError } from "@formbricks/types/errors";
import { TJsPersonState } from "@formbricks/types/js";

/**
 *
 * @param environmentId - The environment id
 * @param userId - The user id
 * @param device - The device type
 * @returns The person state
 * @throws {ValidationError} - If the input is invalid
 * @throws {ResourceNotFoundError} - If the environment or organization is not found
 */
export const getPersonState = async ({
  environmentId,
  userId,
  device,
}: {
  environmentId: string;
  userId: string;
  device: "phone" | "desktop";
}): Promise<{
  state: TJsPersonState["data"];
  revalidateProps?: { contactId: string; revalidate: boolean };
}> => {
  let revalidatePerson = false;
  const environment = await getEnvironment(environmentId);

  if (!environment) {
    throw new ResourceNotFoundError(`environment`, environmentId);
  }

  const organization = await getOrganizationByEnvironmentId(environmentId);

  if (!organization) {
    throw new ResourceNotFoundError(`organization`, environmentId);
  }

  let contact = await getContactByUserId(environmentId, userId);

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        environment: {
          connect: {
            id: environmentId,
          },
        },
        attributes: {
          create: [
            {
              attributeKey: {
                connect: { key_environmentId: { key: "userId", environmentId } },
              },
              value: userId,
            },
          ],
        },
      },
    });

    revalidatePerson = true;
  }

  const contactResponses = await prisma.response.findMany({
    where: {
      contactId: contact.id,
    },
    select: {
      surveyId: true,
    },
  });

  const contactDisplays = await prisma.display.findMany({
    where: {
      contactId: contact.id,
    },
    select: {
      surveyId: true,
      createdAt: true,
    },
  });

  // Get contact attributes for optimized segment evaluation
  const contactAttributes = await getContactAttributes(contact.id);

  const segments = await getPersonSegmentIds(environmentId, contact.id, userId, contactAttributes, device);

  const sortedContactDisplaysDate = contactDisplays?.toSorted(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0]?.createdAt;

  // If the person exists, return the persons's state
  const userState: TJsPersonState["data"] = {
    contactId: contact.id,
    userId,
    segments,
    displays:
      contactDisplays?.map((display) => ({
        surveyId: display.surveyId,
        createdAt: display.createdAt,
      })) ?? [],
    responses: contactResponses?.map((response) => response.surveyId) ?? [],
    lastDisplayAt: contactDisplays?.length > 0 ? sortedContactDisplaysDate : null,
  };

  return {
    state: userState,
    revalidateProps: revalidatePerson ? { contactId: contact.id, revalidate: true } : undefined,
  };
};
