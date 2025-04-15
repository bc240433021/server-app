import multer from "multer";
import multerS3 from "multer-s3";
import s3 from "../lib/s3.js";

function fileUpload(bucketName) {
  const storage = multerS3({
    s3,
    bucket: bucketName,
    acl: "public-read",
    key: function (_request, file, cb) {
      cb(null, file.originalname);
    },
  });

  const upload = multer({ storage });

  return upload;
}

export default fileUpload;
