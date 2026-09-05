/**
 * Rider assignment is server-authoritative.
 *
 * This legacy browser helper previously excluded cash deliveries and wrote
 * rider assignments directly to the database. Keeping the exported function
 * fail-closed prevents an old call site from silently restoring that behavior.
 */
export const autoAssignClosestRiderService = async (): Promise<never> => {
  throw new Error(
    "Browser rider assignment is disabled. The merchant must mark the order ready and the LocalEats API must assign the rider.",
  );
};
