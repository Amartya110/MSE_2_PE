import mongoose from 'mongoose';
import { PLATFORMS } from '../validation.js';

const problemSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true },
    problemId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    rating: { type: Number, min: 0, default: null },
    tags: { type: [String], default: [] },
    difficulty: { type: String, default: 'unknown' },
    url: { type: String, default: null },
    statement: { type: String, default: '' },
    sampleTestCases: {
      type: [
        new mongoose.Schema(
          {
            input: { type: String, required: true, maxlength: 4096 },
            expectedOutput: { type: String, default: '' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

problemSchema.index({ platform: 1, problemId: 1 }, { unique: true });
problemSchema.index({ rating: 1, tags: 1, platform: 1 });

export const Problem =
  mongoose.models.Problem ??
  mongoose.model('Problem', problemSchema, 'problemBank');
