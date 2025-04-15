
import axios from 'axios';
import officeParser from 'officeparser';
import { readFile } from 'fs/promises';


const config = {
    outputErrorToConsole: false,
    newlineDelimiter: '\n',
    ignoreNotes: false,
    putNotesAtLast: false,
};

// Function to parse PPTX files
export const parseOfficeFile = async (url) => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const arrayBuffer = response.data;
        const result = await officeParser.parseOfficeAsync(arrayBuffer, config);
        return result;
    } catch (error) {
        console.error('Error parsing PPTX file:', error);
        throw error;
    }
}

export const parseTexTFile = async (url) => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(response.data);
        return text;
    } catch (error) {
        console.error('Error parsing TXT file:', error);
        throw error;
    }
}