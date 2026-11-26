import { apiRequest } from "./client";

export interface UserProfileUpdate {
  fullname?: string;
  username?: string;
}

export function updateCurrentUser(payload: UserProfileUpdate) {
  return apiRequest<{ id: string; fullname: string; username: string; email: string; created_at: string }>(
    "/users/me",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}
