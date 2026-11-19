/** Whose profile `/profile/:userId?` shows: the user in the path, or the signed-in user without one. */
export function profileTarget(
  userIdParam: string | undefined,
  signedInId: number | undefined,
): { userId: number; isOwnProfile: boolean } {
  const target = userIdParam || signedInId?.toString() || "0";
  return {
    userId: parseInt(target, 10),
    isOwnProfile: !userIdParam || target === signedInId?.toString(),
  };
}
