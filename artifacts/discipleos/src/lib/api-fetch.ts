import { customFetch } from "@workspace/api-client-react";
import { notifyAuthChange } from "./auth";

export function apiFetch(
  input: RequestInfo | URL,
  options: RequestInit = {},
): Promise<Response> {
  return customFetch<Response>(input, {
    ...options,
    credentials: "include",
    responseType: "raw",
  }).then((response) => {
    if (response.status === 401) {
      notifyAuthChange("signed-out");
    }
    return response;
  });
}