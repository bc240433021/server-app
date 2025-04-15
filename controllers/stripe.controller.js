import createHttpError from "http-errors";
import getSubscriptionPlan from "../helpers/stripe/get-subscription-status.js";
import { stripe } from "../lib/stripe.js";
import UserModel from "../models/user.model.js";
import settings from "../utils/settings.cjs";

const { getSettings } = settings;

export async function handleGetPaymentStatus(req, res, next) {
  try {
    const { user } = req;

    const plan = await getSubscriptionPlan(user._id);

    res.json(plan);
  } catch (err) {
    next(err);
  }
}

export async function handleGetProductPricing(req, res, next) {
  try {
    const settings = await getSettings();

    if (!settings.stripeProductId) throw createHttpError(503, "Product not available yet");

    const { stripeProductId } = settings;

    const { data } = await stripe.prices.list({
      product: stripeProductId,
    });

    const stripeProduct = await stripe.products.retrieve(stripeProductId);

    if (!stripeProduct) throw { message: "Product not found", status: 503 };

    const currencies = {
      usd: "$",
      eur: "€",
    };

    const prices = data.map((price) => {
      return {
        id: price.id,
        name: price.nickname,
        price: `${price.unit_amount / 100}${currencies[price.currency]}`,
        interval: price?.recurring?.interval,
      };
    });

    return res.json({
      prices,
      product: {
        name: stripeProduct.name,
        description: stripeProduct.description,
        defaultPrice: stripeProduct.default_price,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateSubscription(req, res, next) {
  try {
    const { userId, priceId } = req.body;

    const user = await UserModel.findOne({ _id: userId }).select("email");

    if (!user) throw createHttpError(404, "Institution not found");

    const { email } = user;

    const settings = await getSettings();

    if (!settings.stripeProductId) throw createHttpError(503, "Product not available yet");

    const { hasPurchased, customerId } = await getSubscriptionPlan(userId);

    const CLIENT_PATH = "";
    const clientUrl = `${process.env.CLIENT_URL}/${CLIENT_PATH}`;

    // The user is on the pro plan.
    // Create a portal session to manage subscription.
    if (hasPurchased) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: clientUrl,
      });

      return res.json({ url: stripeSession.url });
    }

    // The user is on the free plan.
    // Create a checkout session to upgrade.
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: clientUrl,
      cancel_url: clientUrl,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: email,
      locale: "es",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { check2learnUserId: userId },
      subscription_data: {
        trial_period_days: 30,
      },
    });

    return res.json({ url: stripeSession.url });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateRegistrationPlatformPurchaseSession(req, res, next) {
  try {
    const { users } = req.body;

    if (!users.check2learn && !users.vocab21) throw createHttpError(404, "not-authed");

    const settings = await getSettings();

    if (!settings.stripeProductId && users.check2learn) throw createHttpError(503, "Product not available yet");
    if (!settings.vocab21StripeProductPriceId && users.vocab21) throw createHttpError(503, "Product not available yet");

    const { stripeProductId, vocab21StripeProductPriceId, discountCouponId } = settings;

    const stripeProduct = await stripe.products.retrieve(stripeProductId);

    if (!stripeProduct) throw createHttpError(503, "product-not-available-yet");

    const { data } = await stripe.prices.list({
      product: stripeProduct.id,
    });

    const defaultPriceC2L = data.find((price) => price.id === stripeProduct.default_price);

    if (!defaultPriceC2L) throw createHttpError(503, "not-default-price-available-for-check2learn");

    const clientUrl = process.env.REGISTRATION_PLATFORM_URL;

    const isPurchasingMultiple = !!users.check2learn && !!users.vocab21;

    const stripeSession = await stripe.checkout.sessions.create({
      success_url: `${clientUrl}/success`,
      cancel_url: `${clientUrl}/purchase`,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: users.check2learn.email || users.vocab21.email,
      line_items: [
        users.check2learn && { price: defaultPriceC2L.id, quantity: 1 },
        users.vocab21 && { price: vocab21StripeProductPriceId, quantity: 1 },
      ],
      locale: "es",
      discounts: isPurchasingMultiple ? [{ coupon: discountCouponId }] : undefined,
      metadata: { check2learnUserId: users?.check2learn?._id, vocab21UserId: users?.vocab21?._id },
      subscription_data: {
        trial_period_days: 30,
      },
    });

    return res.json({ url: stripeSession.url });
  } catch (err) {
    next(err);
  }
}

export async function webhookHandler(req, res, next) {
  try {
    const payload = req.body;
    const payloadString = JSON.stringify(payload, null, 2);
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });

    let event;
    try {
      event = stripe.webhooks.constructEvent(payloadString, header, secret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    /**
     * @type {import("stripe").Stripe.Checkout.Session}
     */
    const session = event.data.object;
    const { check2learnUserId } = session.metadata;

    if (event.type === "checkout.session.completed") {
      // Retrieve the subscription details from Stripe.
      const subscription = await stripe.subscriptions.retrieve(session.subscription);

      await UserModel.updateOne(
        { _id: check2learnUserId },
        {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          stripeTrialEnd: new Date(subscription.trial_end * 1000),
        }
      );
    }

    if (event.type === "invoice.payment_succeeded") {
      // Retrieve the subscription details from Stripe.
      const subscription = await stripe.subscriptions.retrieve(session.subscription);

      // Update the price id and set the new period end.
      await UserModel.updateOne(
        { stripeSubscriptionId: subscription.id },
        {
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      );
    }

    return res.json({});
  } catch (err) {
    next(err);
  }
}
