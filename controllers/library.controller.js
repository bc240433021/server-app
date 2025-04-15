import ClassModel from '../models/class.model.js';
import UserModel from '../models/user.model.js';
import LibraryModel from '../models/library.model.js';
import pkg from 'http-errors';
import client from '../config/openai.js';
import { processTextintoEmbeddings } from '../utils/embeddings-procesors.js';
const { createHttpError } = pkg;
import index from '../config/pinecone.js';
import parseWebPage from '../utils/webpage_scrapper.js';
import mongoose from 'mongoose';
import { parseOfficeFile, parseTexTFile } from '../utils/files_extractor.js';
export const createLibraryWebResource = async (req, res) => {
    const { classID } = req.params;
    // const { userId } = req.user;
    const { links } = req.body;

    if (!classID || !links) {
        return res.status(400).json({ message: 'Class ID and links are required' });
    }

    if (links.length > 5) {
        return res.status(400).json({ message: 'You can only add up to 5 links' });
    }

    const foundClass = await ClassModel.findById(classID);
    if (!foundClass) {
        return res.status(404).json({ message: 'Class not found' });
    }

    const subject = foundClass.subject;
    const name = foundClass.name;


    // remove space from subject and name
    const subjectWithoutSpace = subject.replace(/\s+/g, '');
    const nameWithoutSpace = name.replace(/\s+/g, '');

    const className = `${subjectWithoutSpace}_${nameWithoutSpace}`;


    // Initialize an array to accumulate the parsed data for each link
    let extractedDataArray = [];

    for (let link of links) {
        // Assuming parseWebPage is an async function that returns parsed data
        const { title, text: parsedData } = await parseWebPage(link);

        if (!parsedData) {
            return res.status(400).json({ message: 'Failed to parse the webpage' });
        }
        extractedDataArray.push({
            fileName: title,
            fileType: "text/html",
            fileUrl: link,
        })


        const metadata = {
            fileName: title,
            subject: className,
            fileType: "text/html",
            fileUrl: link,
        };


        const embeddings = await processTextintoEmbeddings(parsedData, client);
        if (!embeddings) {
            return res.status(400).json({ message: 'Failed to process the webpage into embeddings' });
        }
        if (!embeddings || embeddings.length === 0) {
            console.error('No embeddings to insert into Pinecone');
            return res.status(400).json({ message: 'Failed to process the webpage into embeddings' });;
        }

        const sanitizedTitle = title.replace(/[^\x00-\x7F]/g, '') // removes non-ASCII characters
            .replace(/\s+/g, '_')         // replaces spaces with underscores
            .replace(/[^\w\-]/g, '');



        const vectors = embeddings.map((item, i) => ({
            id: `${sanitizedTitle}_${i}`,
            values: item.embedding,
            metadata: {
                ...metadata,
                text: item.text
            }
        }));

        await index.upsert(vectors, { namespace: className });

    }

    const foundResource = await LibraryModel.findOne({ class: classID });

    if (!foundResource) {
        const createNewResource = new LibraryModel({
            subject,
            class: foundClass._id,
            files: extractedDataArray,
        });
        const freshResource = await createNewResource.save();
        res.status(201).json({ message: 'Library resource created successfully', freshResource });

    }

    console.log("foundResource", foundResource);

    const addFilestoResource = await LibraryModel.findByIdAndUpdate(foundResource._id, {
        $push: {
            files: {
                $each: extractedDataArray
            }
        }
    }, { new: true });
    if (!addFilestoResource) {
        return res.status(500).json({ message: 'Failed to add files to the library resource' });
    }

    res.status(200).json({ message: 'Library resource updated successfully', addFilestoResource });

};

export const createLibraryResource = async (req, res) => {
    try {
        const { classID } = req.params;
        const { files } = req;

        if (!classID || !files) {
            return res.status(400).json({ message: 'files are required' });
        }

        const foundClass = await ClassModel.findById(classID);
        if (!foundClass) {
            throw createHttpError(404, 'Class not found');
        }

        const subject = foundClass.subject;
        const name = foundClass.name;

        const subjectWithoutSpace = subject.replace(/\s+/g, '');
        const nameWithoutSpace = name.replace(/\s+/g, '');
        const className = `${subjectWithoutSpace}_${nameWithoutSpace}`;

        let extractedDataArray = [];
        let extractedData = [];
        let failedFiles = [];

        const supportedMimeTypes = [
            'application/octet-stream',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/pdf',
            'application/vnd.oasis.opendocument.text',
        ];

        for (let file of files) {
            const { location, originalname, mimetype } = file;

            const baseData = {
                fileUrl: location,
                fileName: originalname,
                fileType: mimetype,
            };

            let text = null;

            try {
                if (supportedMimeTypes.includes(mimetype)) {
                    text = await parseOfficeFile(location);
                }
                if (mimetype === 'text/plain') {
                    text = await parseTexTFile(location);
                }

                const embeddings = await processTextintoEmbeddings(text, client);
                if (!embeddings || embeddings.length === 0) {
                    throw new Error('Failed to process text into embeddings');
                }

                const sanitizedTitle = originalname.replace(/[^\x00-\x7F]/g, '')
                    .replace(/\s+/g, '_')
                    .replace(/[^\w\-]/g, '');

                const metadata = {
                    fileName: originalname,
                    subject: className,
                    fileType: mimetype,
                    fileUrl: location,
                };

                const vectors = embeddings.map((item, i) => ({
                    id: `${sanitizedTitle}_${i}`,
                    values: item.embedding,
                    metadata: {
                        ...metadata,
                        text: item.text
                    }
                }));

                await index.upsert(vectors, { namespace: className });

                extractedData.push(baseData);
                extractedDataArray.push({ ...baseData, text });

            } catch (err) {
                console.error(`Failed to process file: ${originalname}`, err);
                failedFiles.push({ ...baseData, error: err.message });
            }
        }

        const foundResource = await LibraryModel.findOne({ class: classID });

        if (!foundResource) {
            const createNewResource = new LibraryModel({
                subject,
                class: foundClass._id,
                files: extractedData,
            });
            const freshResource = await createNewResource.save();
            return res.status(201).json({
                message: 'Library resource created successfully',
                freshResource,
                failedFiles
            });
        }

        const addFilestoResource = await LibraryModel.findByIdAndUpdate(foundResource._id, {
            $push: {
                files: {
                    $each: extractedData
                }
            }
        }, { new: true });

        if (!addFilestoResource) {
            return res.status(500).json({ message: 'Failed to add files to the library resource' });
        }

        res.status(201).json({
            message: 'Library resource created successfully',
            extractedData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




export const getAllLibraryResources = async (req, res) => {
    try {
        const classId = req.params.classId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let fileType = req.query.fileType;
        let searchQuery = req.query.search?.toLowerCase();

        if (fileType && !Array.isArray(fileType)) {
            fileType = [fileType];
        }

        let filteredFiles = [];

        if (classId) {
            // ✅ Validate ObjectId
            if (!mongoose.Types.ObjectId.isValid(classId)) {
                return res.status(400).json({ error: "Invalid classId format" });
            }

            // ✅ Find files of a single class
            const libraryDoc = await LibraryModel.findOne({ class: classId });
            if (!libraryDoc || !libraryDoc.files) {
                return res.status(404).json({ message: "No library resources found for the specified class" });
            }

            filteredFiles = libraryDoc.files;
        } else {
            // ✅ Fetch all files from all classes
            const allLibraryDocs = await LibraryModel.find({});
            filteredFiles = allLibraryDocs.flatMap(doc => doc.files || []);
        }

        // ✅ Filter by fileType
        if (fileType && fileType.length > 0) {
            filteredFiles = filteredFiles.filter(file =>
                fileType.includes(file.fileType)
            );
        }

        // ✅ Filter by search query on fileName (case-insensitive)
        if (searchQuery) {
            filteredFiles = filteredFiles.filter(file =>
                file.fileName?.toLowerCase().includes(searchQuery)
            );
        }


        // Sort by uploadedAt in descending order
        filteredFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

        const totalCount = filteredFiles.length;
        const totalPages = Math.ceil(totalCount / limit);
        const paginatedFiles = filteredFiles.slice(skip, skip + limit);




        res.status(200).json({
            message: "Library resources retrieved successfully",
            resources: paginatedFiles,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const searchLibraryController = async (req, res) => {
    try {
        const { q, fileType } = req.query;
        console.log("search", q, "fileType", fileType);

        if (!q) {
            return res.status(400).json({ message: "Search query is required" });
        }

        // Step 1: Fetch resources from MongoDB that match the filename query
        const resources = await LibraryModel.find({
            'files.fileName': { $regex: q, $options: 'i' },
        });

        const files = resources.map(resource => resource.files).flat();

        // Optional filter by MIME type
        let filteredFiles = files;
        if (fileType && fileType !== 'other') {
            filteredFiles = files.filter(file => file.fileType?.toLowerCase() === fileType.toLowerCase());
        } else if (fileType === 'other') {
            const knownTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text', 'text/plain'];
            filteredFiles = files.filter(file => !knownTypes.includes(file.fileType?.toLowerCase()));
        }

        const resourceNames = filteredFiles.map(file => file.fileName);
        const uniqueResourceNames = [...new Set(resourceNames)];

        // Step 2: Pinecone search with optional MIME fileType filtering
        const pineconeFilter = {
            fileName: { $in: uniqueResourceNames },
        };

        if (fileType && fileType !== 'other') {
            pineconeFilter.fileType = fileType.toLowerCase();
        } else if (fileType === 'other') {
            pineconeFilter.fileType = {
                $nin: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text', 'text/plain'],
            };
        }

        const results = await index.query({
            vector: Array(1536).fill(0),
            topK: 100,
            filter: pineconeFilter,
            includeMetadata: true,
        });

        if (!results || results.matches.length === 0) {
            return res.status(404).json({ message: "No resources found" });
        }

        // Step 3: Extract file info from Pinecone results
        const uniqueResources = [];
        const seenUrls = new Set();

        results.matches.forEach(match => {
            const { fileName, fileUrl, fileType } = match.metadata;
            if (!seenUrls.has(fileUrl)) {
                seenUrls.add(fileUrl);
                uniqueResources.push({ fileName, fileUrl, fileType });
            }
        });

        return res.status(200).json({
            success: true,
            resources: uniqueResources,
            message: "Library resources retrieved successfully",
        });
    } catch (error) {
        console.error("Error searching library:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to search library.",
        });
    }
};
