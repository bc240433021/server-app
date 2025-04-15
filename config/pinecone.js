// apps/server/config/pinecone.js
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

config();

const INDEX_NAME = process.env.PINECONE_INDEX_NAME;

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  maxRetries: 5, // Optional: defaults to 3 if not specified
});

async function getOrCreateIndex() {
  const existingIndexes = await pinecone.listIndexes();
  // console.log("Existing indexes:", existingIndexes);
  const indexExists = existingIndexes.indexes.map((index) => index.name).includes(INDEX_NAME);
  console.log("Index exists:", indexExists);
  if (!indexExists) {
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: 1536,
    });
  }
  return pinecone.index(INDEX_NAME);
}

const index = await getOrCreateIndex();
export default index;
