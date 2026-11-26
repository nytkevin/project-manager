export type ReviewResult = "Approved" | "Changes Requested";

export interface ReviewResponse {
  id: string;
  task_id: string;
  reviewer_id: string;
  result: ReviewResult;
  comments: string;
  created_at: string;
}

export interface ReviewRecord {
  id: string;
  reviewerId: string;
  reviewerName: string;
  result: ReviewResult;
  comments: string;
  createdAt: string;
}

export interface ReviewCreate {
  result: ReviewResult;
  comments: string;
}
