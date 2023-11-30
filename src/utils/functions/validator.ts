import environment from "@/config/env";

const IMPORTANT_PARAMETERS = Object.keys(environment);

export const isConfigValid = (environment: Record<string, string | number>) =>
  IMPORTANT_PARAMETERS.every((param) => environment[param]);
