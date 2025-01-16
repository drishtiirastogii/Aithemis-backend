import express, { response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import path from "path";
import mongoose from "mongoose";
import databaseConnection from "./utils/database.js"
import File from "./models/fileModel.js"
import Question from "./models/quesModel.js";
import axios from "axios";

dotenv.config();

databaseConnection();

const app = express();
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST'], 
    credentials: true, 
  }));

const storage = multer.memoryStorage();

const upload = multer({storage})

app.post('/upload', upload.single('file'), async(req, res) => {
    try {
      console.log('Request Body:', req.body); 
      console.log('Uploaded File:', req.file); 
  
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const { buffer } = req.file;
      const { default: pdfParse } = await import('pdf-parse');      
      const data = await pdfParse(buffer); 

      const extractedText = data.text;
      //console.log('Extracted Text:', extractedText);

      const newFile = new File({
        fieldname: req.file.fieldname,
        originalName: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        destination: req.file.destination,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        content: extractedText
      });
  
      const savedFile = await newFile.save();

      const fileIdString = savedFile._id.toString();

      res.status(200).json({ 
      message: 'File uploaded successfully', 
      fileId: fileIdString,
      filename: savedFile.filename 
    });
    } catch (error) {
      console.error('Error in file upload:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/ques', async (req, res) => {
    try {
      console.log("Received body:", req.body);
      const { question, fileId } = req.body;
      console.log("Received fileId:", fileId);

      const fileObjectId = new mongoose.Types.ObjectId(fileId);

      const file = await File.findById(fileObjectId);
      if (!file) {
        return res.status(400).json({ error: 'File not found.' });
      }
        const newQuestion = new Question({
        question: question.trim(),
        fileId: fileObjectId,
      });

      await newQuestion.save();
      const response = {
        message: 'Question saved successfully',
        question: {
          ...newQuestion.toObject(),
          _id: newQuestion._id.toString(),
          fileId: newQuestion.fileId.toString()
        }
      };  
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in saving question:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });  

    app.post("/generate", async (req, res) => {
    try {
    console.log("Full request body:", req.body);
    const { fileId } = req.body;
    // const fileObjectId = new mongoose.Types.ObjectId(fileId);
    // const file = await File.findById(fileObjectId);
    console.log("Received fileId:", fileId);  

    if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: "Invalid or missing fileId format." });
    }

    const fileObjectId = new mongoose.Types.ObjectId(fileId);
    
    const file = await File.findById(fileObjectId);
    if (!file) {
      return res.status(404).json({ error: "File not found." });
    }

    const question = await Question.findOne({ fileId: fileObjectId }).sort({ _id: -1 });
    console.log("Found Question:", question);

    if (!question) {
      return res.status(400).json({ error: "Question not found." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API Key is missing." });
    }
    const prompt = `${file.content}\n\nQuestion: ${question.question}`;

    try {
      const genResponse = await axios.post('http://localhost:5000/generate', {
        prompt: prompt,
        model: "gemini-1.5-flash"
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
        }
      });

      console.log("Gemini API response received:", genResponse.data);

      if (!genResponse.data || !genResponse.data.text) {
        throw new Error('Invalid response from Gemini API');
      }
      res.status(200).json({ answer: genResponse.data.text });

    } catch (apiError) {
      console.error('Gemini API Error:', apiError.response?.data || apiError.message);
      res.status(500).json({ 
        error: "Error generating response from AI",
        details: apiError.response?.data || apiError.message
      });
    }

  } catch (error) {
    console.error("Error generating response:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-file-id", async (req, res) => {
  try {
    const file = await File.findOne().sort({ uploadDate: -1 });
    
    if (!file) {
      return res.status(404).json({ error: "No files found." });
    }

    const fileIdString = file._id.toString();
    res.status(200).json({ fileId: fileIdString });
  } catch (error) {
    console.error("Error retrieving fileId:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server listening at port ${process.env.PORT}`);
});