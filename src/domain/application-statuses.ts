export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

type ApplicationStatusDefinition = {
  label: string;
  description: string;
  requiresAppliedAt: boolean;
};

export const APPLICATION_STATUS_DEFINITIONS = {
  saved: {
    label: "Saved",
    description:
      "The job is tracked, but the user has not submitted an application.",
    requiresAppliedAt: false,
  },
  applied: {
    label: "Applied",
    description:
      "The application was submitted and no later milestone or outcome is recorded.",
    requiresAppliedAt: true,
  },
  interview: {
    label: "Interview",
    description:
      "The employer moved the submitted application into its interview process.",
    requiresAppliedAt: true,
  },
  offer: {
    label: "Offer",
    description: "The employer made an offer for the submitted application.",
    requiresAppliedAt: true,
  },
  rejected: {
    label: "Rejected",
    description: "The employer ended the submitted candidacy.",
    requiresAppliedAt: true,
  },
  withdrawn: {
    label: "Withdrawn",
    description:
      "The user ended the submitted candidacy, including by declining an offer.",
    requiresAppliedAt: true,
  },
} as const satisfies Record<ApplicationStatus, ApplicationStatusDefinition>;

export type SubmittedApplicationStatus = Exclude<ApplicationStatus, "saved">;

/** An ISO 8601 calendar date (`YYYY-MM-DD`), validated at the input boundary. */
export type ApplicationDate = string;

export type ApplicationSubmissionInput = {
  status: ApplicationStatus;
  appliedAt: ApplicationDate | null;
};

export type ApplicationSubmission =
  | {
      status: "saved";
      appliedAt: null;
    }
  | {
      status: SubmittedApplicationStatus;
      appliedAt: ApplicationDate;
    };

/**
 * A submitted application is counted only from its persisted `applied_at` value.
 * Status changes must not clear or replace that original date, and a submitted
 * application must never be moved back to `saved`.
 */
export function isSubmittedApplication(
  application: Pick<ApplicationSubmissionInput, "appliedAt">,
): boolean {
  return application.appliedAt !== null;
}

export function countSubmittedApplications(
  applications: readonly Pick<ApplicationSubmissionInput, "appliedAt">[],
): number {
  return applications.filter(isSubmittedApplication).length;
}

export function hasValidSubmissionState(
  application: ApplicationSubmissionInput,
): application is ApplicationSubmission {
  const requiresAppliedAt =
    APPLICATION_STATUS_DEFINITIONS[application.status].requiresAppliedAt;

  return requiresAppliedAt === isSubmittedApplication(application);
}
