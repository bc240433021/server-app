import upload from "../../utils/file-uploader.js";

export const uploadFile = (bucketName) => (req, res, next) => {
  const uploader = upload(bucketName);

  uploader.single("file")(req, res, (err) => {
    console.log("s3", req);
    if (err) {
      // console.log(err);
      res.status(500).json({
        message: err.message || "Unexpected server side error. When uploading file to the server",
      });
    } else {
      next();
    }
  });
};


export const uploadMultipleFiles = (bucketName, fieldName = "files", maxCount = 5) => (req, res, next) => {
  const uploader = upload(bucketName);

  // Change from `.single()` to `.array()` for multiple files
  uploader.array(fieldName, maxCount)(req, res, (err) => {
    // console.log("s3 req", req.files);
    // console.log("s3 res", res);
    if (err) {
      console.log(err);
      res.status(500).json({
        message: err.message || "Unexpected server error when uploading files.",
      });
    } else {
      next();
    }
  });
};


// export default { uploadFile, uploadMultipleFiles };
