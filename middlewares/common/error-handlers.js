import { AxiosError } from "axios";
import createHttpError from "http-errors";

export function notFoundHandler(_req, _res, next) {
  next(createHttpError(404, "Your requested route was not found"));
}

export function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    next("There was an unexpected error");
  } else {
    let status = err.status || 500;
    let message = err.message || err;

    if (err instanceof AxiosError) {
      status = err.response?.status;
      message = err.response?.data?.msg || err.message;
    }

    res.status(status).json({ status, message });
  }
}
