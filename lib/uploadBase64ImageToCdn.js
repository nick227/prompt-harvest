import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import { startSession } from 'mongoose';
dotenv.config();

const API_URL = 'https://web.de01.sonic.r-cdn.com/api/v3/upload';

async function uploadBase64ImageToCdn(base64Image, filename) {
    const zoneId = process.env.PUSHRCDN_ZONE_ID;
    const directory = process.env.PUSHRCDN_DIRECTORY;
    const uploadServer = process.env.PUSHRCDN_UPLOAD_SERVER;
  try {
    console.log('uploadBase64ImageToCdn', filename)
    startSession('uploadBase64ImageToCdn')
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const formData = new FormData();
    formData.append('file', imageBuffer, { filename: filename });
    formData.append('zone_id', zoneId);
    formData.append('directory', directory);
    formData.append('upload_server', uploadServer);
    formData.append('api_key', process.env.PUSHRCDN_API_KEY);

    const response = await axios.post(API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
      }
    });
    console.log('response', response)

    if (response.status === 200 && response.data && response.data.status === 'success') {
      return response.data.URL; // Returns the URL where the image is stored
    } else {
      throw new Error('Failed to upload image');
    }
  } catch (error) {
    console.error('Error uploading image:', error.message);
    return null;
  }
}

export default uploadBase64ImageToCdn;