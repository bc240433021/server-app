import axios from 'axios';
import { load } from 'cheerio';

const parseWebPage = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const $ = load(data);

    // Extract the title
    const title = $('title').text().trim();

    // Remove scripts and styles
    $('script, style, noscript').remove();

    // Get clean text from visible body
    const text = $('body').text();
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // console.log({ title, text: cleanText });

    return { title, text: cleanText };

  } catch (error) {
    console.error('Error fetching the page:', error.message);
    return null;
  }
};

export default parseWebPage;
