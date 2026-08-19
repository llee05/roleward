export const ROLE_LEVELS = [
  "internship",
  "graduate",
  "junior",
  "other",
] as const;

export type RoleLevel = (typeof ROLE_LEVELS)[number];

type RoleLevelDefinition = {
  label: string;
  description: string;
};

export const ROLE_LEVEL_DEFINITIONS = {
  internship: {
    label: "Internship",
    description: "A role explicitly advertised as an internship or placement.",
  },
  graduate: {
    label: "Graduate",
    description: "A role explicitly advertised as a graduate role or program.",
  },
  junior: {
    label: "Junior",
    description:
      "A junior or entry-level role that is not an internship or graduate program.",
  },
  other: {
    label: "Other",
    description:
      "A role at any other level, or one whose level cannot be classified.",
  },
} as const satisfies Record<RoleLevel, RoleLevelDefinition>;
