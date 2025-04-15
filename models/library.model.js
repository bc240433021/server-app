import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        // owner: { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true },
        subject: { type: String, required: true },
        class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, },
        files: {
            type: [
                {
                    fileName: { type: String },
                    fileType: { type: String, required: true },
                    fileUrl: { type: String, required: true },
                    uploadedAt: { type: Date, default: Date.now },
                },
            ],
            required: true,
        }
    },
    { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const LibraryModel = new mongoose.model("Library", schema);

export default LibraryModel;
