export interface ProjectMemberResponse {
  user_id: string;
  fullname: string;
  username: string;
  email: string;
  roles: string;
  created_at: string;
}

export interface TeamMember extends ProjectMemberResponse {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  projectRole?: string;
  online?: boolean;
}
