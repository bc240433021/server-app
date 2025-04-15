import createHttpError from "http-errors";
import { stripe } from "../../lib/stripe.js";
import UserModel from "../../models/user.model.js";

/**
 * @param {String} userId
 */
export default async function getSubscriptionPlan(userId) {
  const entity = await UserModel.findOne({ _id: userId }).select(
    "stripeSubscriptionId stripeCurrentPeriodEnd stripeCustomerId stripePriceId"
  );

  if (!entity) throw createHttpError(403, "payment-entity-not-found");

  const hasPurchased =
    parseInt(process.env.IS_FREE) === 1
      ? true
      : !!(entity.stripePriceId && entity.stripeCurrentPeriodEnd?.getTime() + 86_400_000 > Date.now());

  let isCanceled = false;

  if (hasPurchased && entity.stripeSubscriptionId) {
    const stripePlan = await stripe.subscriptions.retrieve(entity.stripeSubscriptionId);
    isCanceled = stripePlan.cancel_at_period_end;
  }

  return {
    entity,
    customerId: entity.stripeCustomerId,
    stripeCurrentPeriodEnd: entity.stripeCurrentPeriodEnd?.getTime(),
    isCanceled,
    hasPurchased,
  };
}
