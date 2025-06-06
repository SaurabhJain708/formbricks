/* eslint-disable no-console -- required for logging errors */
import { ApiClient } from "@/lib/common/api";
import { Config } from "@/lib/common/config";
import { Logger } from "@/lib/common/logger";
import { filterSurveys, getIsDebug } from "@/lib/common/utils";
import { type TUpdates, type TUserState } from "@/types/config";
import { type ApiErrorResponse, type Result, type ResultError, err, ok, okVoid } from "@/types/error";

export const sendUpdatesToBackend = async ({
  appUrl,
  environmentId,
  updates,
}: {
  appUrl: string;
  environmentId: string;
  updates: TUpdates;
}): Promise<
  Result<
    {
      state: TUserState;
      messages?: string[];
    },
    ApiErrorResponse
  >
> => {
  const url = `${appUrl}/api/v1/client/${environmentId}/user`;

  try {
    const api = new ApiClient({
      appUrl,
      environmentId,
      isDebug: getIsDebug(),
    });

    const response = await api.createOrUpdateUser({
      userId: updates.userId,
      attributes: updates.attributes,
    });

    if (!response.ok) {
      return err({
        code: response.error.code,
        status: response.error.status,
        message: `Error updating user with userId ${updates.userId}`,
        url: new URL(url),
        responseMessage: response.error.message,
      });
    }

    return ok(response.data);
  } catch (e) {
    const errorTyped = e as { message?: string };

    const error = err({
      code: "network_error",
      message: errorTyped.message ?? "Error fetching the person state",
      status: 500,
      url: new URL(url),
      responseMessage: errorTyped.message ?? "Unknown error",
    });

    return error as ResultError<ApiErrorResponse>;
  }
};

export const sendUpdates = async ({
  updates,
}: {
  updates: TUpdates;
}): Promise<Result<void, ApiErrorResponse>> => {
  const config = Config.getInstance();
  const logger = Logger.getInstance();

  const { appUrl, environmentId } = config.get();
  // update endpoint call
  const url = `${appUrl}/api/v1/client/${environmentId}/user`;

  try {
    const updatesResponse = await sendUpdatesToBackend({ appUrl, environmentId, updates });

    if (updatesResponse.ok) {
      const userState = updatesResponse.data.state;
      const filteredSurveys = filterSurveys(config.get().environment, userState);

      // messages => string[] - contains the details of the attributes update
      // for example, if the attribute "email" was being used for some user or not
      const messages = updatesResponse.data.messages;

      if (messages && messages.length > 0) {
        for (const message of messages) {
          logger.debug(`User update message: ${message}`);
        }
      }

      config.update({
        ...config.get(),
        user: {
          ...userState,
        },
        filteredSurveys,
      });

      return okVoid();
    }

    return err(updatesResponse.error);
  } catch (e) {
    console.error("error in sending updates: ", e);

    if ("code" in (e as ApiErrorResponse)) {
      const errorTyped = e as ApiErrorResponse;
      return err({
        code: errorTyped.code,
        message: errorTyped.message,
        status: errorTyped.status,
        url: new URL(url),
        responseMessage: errorTyped.responseMessage,
      });
    }

    return err({
      code: "network_error",
      message: "Error sending updates",
      status: 500,
      url: new URL(url),
      responseMessage: "Unknown error",
    });
  }
};
