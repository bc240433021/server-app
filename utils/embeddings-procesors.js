import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import index from "../config/pinecone.js";

 const getEmbeddings = async (text, client) => {
    const embeddings = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
    })
    return embeddings?.data[0]?.embedding;
}


const splitText = async (text) => {
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 500,
    });
    const chunks = await textSplitter.splitText(text);
    return chunks;
}

const processFiles = async (files) => {
    
}

const processTextintoEmbeddings = async (text, client) => {

    const chunks = await splitText(text);

    console.log("Chunks:", chunks[0]);
    if (chunks.length === 0) {
        console.error("No chunks generated from the text.");
        return null;
    }

    let embaddingsData = [];
    for (const chunk of chunks) {
        const embedding = await getEmbeddings(chunk, client);
        embaddingsData.push({
            text: chunk,
            embedding: embedding,
        });
    }
    if (embaddingsData.length === 0) {
        console.error("No embeddings generated from the text.");
        return null;
    }

    return embaddingsData;
}

const storeDatainPineCone = async (fileName, subject, fileType,fileUrl ,client) => {
    try {
        const metadata = {
            fileName: fileName,
            subject: subject,
            fileType: fileType,
            fileUrl: fileUrl,
        };
        const embeddings = await processTextintoEmbeddings(fileUrl, client);

        if (!embeddings) {
            console.error("No embeddings generated.");
            return null;
        }


        // index data to pinecone

        if (!embeddings || embeddings.length === 0) {
            console.error('No embeddings to insert into Pinecone');
            return false;
        }

        const vectors = embeddings.map((item, i) => ({
            id: `${title}_${i}`,
            values: item.embedding,
            metadata: {
                ...metadata,
                text: item.text
            }
        }));

        success = await index.upsert({
            vectors: vectors,
            namespace: subject, // Use the subject as the namespace
        })

        return true;

    } catch (error) {
        console.error("Error storing data in PineCone:", error);
        return null;
    }
}



const indexMultipleFiles = async (files, subject, client) => {
   const fileList = Array.isArray(files) ? files : [files];
   let allSuccess = true;

    for (const file of fileList) {
         const { fileName, fileType, fileUrl } = file;
         const success = await storeDatainPineCone(fileName, subject, fileType,fileUrl, client);
         if (!success) {
              allSuccess = false;
         }else{
                console.log(`Successfully indexed file: ${fileName}`);
         }
    }
    return allSuccess;
}


export default indexMultipleFiles;
export { processTextintoEmbeddings, storeDatainPineCone, splitText, getEmbeddings };