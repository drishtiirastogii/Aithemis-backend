import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
});

const Question = mongoose.model('Question', questionSchema);

export default Question;
