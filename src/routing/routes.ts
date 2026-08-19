export const ROUTES = {
  login: "/login",
  jobs: "/jobs",
  job: "/jobs/[id]",
  applications: "/applications",
  documents: "/documents",
  dashboard: "/dashboard",
} as const;

export type RouteName = keyof typeof ROUTES;
export type RoutePattern = (typeof ROUTES)[RouteName];
export type RouteAccess = "public" | "protected";

type RouteDefinition = {
  pattern: RoutePattern;
  access: RouteAccess;
  purpose: string;
};

export const ROUTE_DEFINITIONS = {
  login: {
    pattern: ROUTES.login,
    access: "public",
    purpose: "Sign up or sign in before entering the application.",
  },
  jobs: {
    pattern: ROUTES.jobs,
    access: "protected",
    purpose: "Search and filter jobs, or start adding one manually.",
  },
  job: {
    pattern: ROUTES.job,
    access: "protected",
    purpose: "Review one job, save it, or record a submitted application.",
  },
  applications: {
    pattern: ROUTES.applications,
    access: "protected",
    purpose: "Review tracked jobs and update application status or notes.",
  },
  documents: {
    pattern: ROUTES.documents,
    access: "protected",
    purpose: "Upload and manage CVs and cover letters for applications.",
  },
  dashboard: {
    pattern: ROUTES.dashboard,
    access: "protected",
    purpose: "Review submitted totals, current statuses, and weekly progress.",
  },
} as const satisfies Record<RouteName, RouteDefinition>;

export function jobPath(jobId: string): string {
  if (jobId.length === 0) {
    throw new Error("A job id is required to build a job path.");
  }

  return `${ROUTES.jobs}/${encodeURIComponent(jobId)}`;
}
