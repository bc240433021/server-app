import getSubscriptionPlan from "../../helpers/stripe/get-subscription-status.js";

export default async function requirePurchase(req, res, next) {
  try {
    const { user } = req;
    const userId = user._id;

    const { hasPurchased } = await getSubscriptionPlan(userId);

    if (!hasPurchased && user.role === "STUDENT") return res.sendStatus(402);

    next();
  } catch (err) {
    res.status(500).json({ message: err?.message || err });
  }
}
