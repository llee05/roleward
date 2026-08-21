export const ROUTES = {
  home: "/",
  jobs: "/jobs",
  job: "/jobs/[id]",
  applications: "/applications",
  documents: "/documents",
  dashboard: "/dashboard",
  settings: "/settings",
} as const;

export type RouteName = keyof typeof ROUTES;
export type RoutePattern = (typeof ROUTES)[RouteName];

type RouteDefinition = {
  pattern: RoutePattern;
  purpose: string;
};

export const ROUTE_DEFINITIONS = {
  home: {
    pattern: ROUTES.home,
    purpose:
      "Start fresh, load a sample, restore, or continue a local workspace.",
  },
  jobs: {
    pattern: ROUTES.jobs,
    purpose: "Search and filter jobs, or start adding one manually.",
  },
  job: {
    pattern: ROUTES.job,
    purpose: "Review one job, save it, or record a submitted application.",
  },
  applications: {
    pattern: ROUTES.applications,
    purpose:
      "Review tracked jobs; update status or notes; or remove an application.",
  },
  documents: {
    pattern: ROUTES.documents,
    purpose: "Store and manage local CVs and cover letters for applications.",
  },
  dashboard: {
    pattern: ROUTES.dashboard,
    purpose: "Review the submitted total and current-status counts.",
  },
  settings: {
    pattern: ROUTES.settings,
    purpose: "Export, import, inspect, or reset the browser-local workspace.",
  },
} as const satisfies Record<RouteName, RouteDefinition>;

export function jobPath(jobId: string): string {
  if (jobId.length === 0) {
    throw new Error("A job id is required to build a job path.");
  }

  return `${ROUTES.jobs}/${encodeURIComponent(jobId)}`;
}
