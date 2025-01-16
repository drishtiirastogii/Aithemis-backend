import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  fieldname: { type: String, required: true },
  originalName: { type: String, required: true },
  encoding: { type: String, required: false },
  mimetype: { type: String, required: false },
  content: { type: String, required: true }, 
  destination: { type: String, required: false },  
  filename: { type: String, required: false },  
  path: { type: String, required: false }, 
  size: { type: Number, required: true },
  uploadDate: { type: Date, default: Date.now },
});

const File = mongoose.model('File', fileSchema);
export default File;
