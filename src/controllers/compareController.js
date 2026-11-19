export const createCompareController = (profileService) => async (
  request,
  response,
  next,
) => {
  try {
    const comparison = await profileService.comparePlatformUsers({
      platform: request.params.platform,
      firstHandle: request.query.u1,
      secondHandle: request.query.u2,
    });
    response.json({ ok: true, comparison });
  } catch (error) {
    next(error);
  }
};
