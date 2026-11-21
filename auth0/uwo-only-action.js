/**
 * Auth0 Action — Login / Post Login flow.
 * Auth0 Dashboard → Actions → Library → Create Action (Login / Post Login),
 * paste this, Deploy, then drag it into Actions → Triggers → post-login.
 *
 * Only Western (@uwo.ca) accounts may sign in to Mustang City.
 */
exports.onExecutePostLogin = async (event, api) => {
  const email = (event.user.email || "").toLowerCase();
  if (!email.endsWith("@uwo.ca")) {
    api.access.deny("Only @uwo.ca accounts can sign in to Mustang City.");
  }
};
