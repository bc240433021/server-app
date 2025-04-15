import axios from "axios";

export default async function verifyPayment(_req, res, next) {
  try {
    const { data } = await axios.get("https://verify-payment.vercel.app/lms");

    if (!data.project.hasPaid) {
      return res.status(402).json({ message: "This client did not cleared the payment of the developer" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: err.message || JSON.stringify(err) });
  }
}
