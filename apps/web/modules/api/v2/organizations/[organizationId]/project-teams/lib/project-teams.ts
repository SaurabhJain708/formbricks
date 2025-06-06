import { captureTelemetry } from "@/lib/telemetry";
import { getProjectTeamsQuery } from "@/modules/api/v2/organizations/[organizationId]/project-teams/lib/utils";
import {
  TGetProjectTeamsFilter,
  TProjectTeamInput,
  ZProjectZTeamUpdateSchema,
} from "@/modules/api/v2/organizations/[organizationId]/project-teams/types/project-teams";
import { ApiErrorResponseV2 } from "@/modules/api/v2/types/api-error";
import { ApiResponseWithMeta } from "@/modules/api/v2/types/api-success";
import { ProjectTeam } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@formbricks/database";
import { Result, err, ok } from "@formbricks/types/error-handlers";

export const getProjectTeams = async (
  organizationId: string,
  params: TGetProjectTeamsFilter
): Promise<Result<ApiResponseWithMeta<ProjectTeam[]>, ApiErrorResponseV2>> => {
  try {
    const query = getProjectTeamsQuery(organizationId, params);

    const [projectTeams, count] = await prisma.$transaction([
      prisma.projectTeam.findMany({
        ...query,
      }),
      prisma.projectTeam.count({
        where: query.where,
      }),
    ]);

    return ok({
      data: projectTeams,
      meta: {
        total: count,
        limit: params.limit,
        offset: params.skip,
      },
    });
  } catch (error) {
    return err({ type: "internal_server_error", details: [{ field: "projectTeam", issue: error.message }] });
  }
};

export const createProjectTeam = async (
  teamInput: TProjectTeamInput
): Promise<Result<ProjectTeam, ApiErrorResponseV2>> => {
  captureTelemetry("project team created");

  const { teamId, projectId, permission } = teamInput;

  try {
    const projectTeam = await prisma.projectTeam.create({
      data: {
        teamId,
        projectId,
        permission,
      },
    });

    return ok(projectTeam);
  } catch (error) {
    return err({ type: "internal_server_error", details: [{ field: "projectTeam", issue: error.message }] });
  }
};

export const updateProjectTeam = async (
  teamId: string,
  projectId: string,
  teamInput: z.infer<typeof ZProjectZTeamUpdateSchema>
): Promise<Result<ProjectTeam, ApiErrorResponseV2>> => {
  try {
    const updatedProjectTeam = await prisma.projectTeam.update({
      where: {
        projectId_teamId: {
          projectId,
          teamId,
        },
      },
      data: teamInput,
    });

    return ok(updatedProjectTeam);
  } catch (error) {
    return err({ type: "internal_server_error", details: [{ field: "projectTeam", issue: error.message }] });
  }
};

export const deleteProjectTeam = async (
  teamId: string,
  projectId: string
): Promise<Result<ProjectTeam, ApiErrorResponseV2>> => {
  try {
    const deletedProjectTeam = await prisma.projectTeam.delete({
      where: {
        projectId_teamId: {
          projectId,
          teamId,
        },
      },
    });

    return ok(deletedProjectTeam);
  } catch (error) {
    return err({ type: "internal_server_error", details: [{ field: "projectTeam", issue: error.message }] });
  }
};
