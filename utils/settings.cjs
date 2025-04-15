const { z } = require("zod");
const fs = require("fs").promises;
const path = require("path");

const settingsPath = path.join(__dirname, "../private/settings.json");

const initialSettings = {
  stripeProductId: "",
  vocab21StripeProductPriceId: "",
  discountCouponId: "",
  classInvitationEmailSubject: "",
  classInvitationEmailMessage: "",
  resetPasswordEmailSubject: "",
  resetPasswordEmailMessage: "",
  classAssignmentEmailSubject: "",
  classAssignmentEmailMessage: "",
};

const settingsSchema = z.object({
  stripeProductId: z.string(),
  vocab21StripeProductPriceId: z.string(),
  discountCouponId: z.string(),
  classInvitationEmailSubject: z.string(),
  classInvitationEmailMessage: z.string(),
  resetPasswordEmailSubject: z.string(),
  resetPasswordEmailMessage: z.string(),
  classAssignmentEmailSubject: z.string(),
  classAssignmentEmailMessage: z.string(),
});

exports.settingsSchema = settingsSchema;

exports.save = async function (data) {
  await fs.writeFile(settingsPath, JSON.stringify(data));
};

/**
 * @returns {Promise<typeof initialSettings>}
 */
exports.getSettings = async function () {
  try {
    const settings = JSON.parse(await fs.readFile(settingsPath, "utf-8"));

    for (const key of Object.keys(initialSettings)) {
      if (!settings[key]) {
        settings[key] = "";
      }
    }

    return settings;
  } catch (err) {
    if (err.code === "ENOENT") {
      return initialSettings;
    }
    throw err;
  }
};
