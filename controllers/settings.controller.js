import settings from "../utils/settings.cjs";

const { getSettings, save } = settings;

export async function handleGetSettings(_req, res, next) {
  try {
    const settings = await getSettings();

    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function handleSaveSettings(req, res, next) {
  try {
    const update = req.body;
    await save(update);
    res.json({ message: "settings-updated-successfully" });
  } catch (err) {
    next(err);
  }
}
