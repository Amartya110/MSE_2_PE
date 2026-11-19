import mongoose from 'mongoose';
import { PLATFORMS } from '../validation.js';

const { Schema } = mongoose;

const cpPlatformStatsSchema = new Schema(
  {
    rating: { type: Number, default: null },
    maxRating: { type: Number, default: null },
    rank: { type: Schema.Types.Mixed, default: null },
    syncedAt: { type: Date, default: null },
  },
  { _id: false },
);

const difficultySchema = new Schema(
  {
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
    unknown: { type: Number, default: 0 },
  },
  { _id: false },
);

const dsaPlatformStatsSchema = new Schema(
  {
    totalSolved: { type: Number, default: 0 },
    byDifficulty: { type: difficultySchema, default: () => ({}) },
    syncedAt: { type: Date, default: null },
  },
  { _id: false },
);

const contestSchema = new Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true },
    contestId: { type: String, required: true },
    contestName: { type: String, default: null },
    rank: { type: Number, default: null },
    rating: { type: Number, default: null },
    ratingChange: { type: Number, default: null },
    date: { type: Date, default: null },
  },
  { _id: false },
);

const solvedProblemSchema = new Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true },
    problemId: { type: String, required: true },
    title: { type: String, required: true },
    rating: { type: Number, default: null },
    tags: { type: [String], default: [] },
    solvedAt: { type: Date, default: null },
    verdict: { type: String, default: 'unknown' },
  },
  { _id: false },
);

const recentSubmissionSchema = new Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true },
    problemId: { type: String, required: true },
    title: { type: String, default: '' },
    tags: { type: [String], default: [] },
    verdict: { type: String, required: true },
    language: { type: String, default: null },
    submittedAt: { type: Date, default: null },
  },
  { _id: false },
);

const topicStatsSchema = new Schema(
  {
    platform: { type: String, enum: PLATFORMS, required: true },
    name: { type: String, required: true },
    solvedCount: { type: Number, default: 0 },
    failedAttempts: { type: Number, default: 0 },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      unique: true,
      sparse: true,
    },
    username: { type: String, required: true, unique: true, index: true },
    platformHandles: { type: Map, of: String, default: () => new Map() },
    cpProfile: {
      platforms: {
        type: Map,
        of: cpPlatformStatsSchema,
        default: () => new Map(),
      },
    },
    dsaProfile: {
      platforms: {
        type: Map,
        of: dsaPlatformStatsSchema,
        default: () => new Map(),
      },
      topics: { type: [topicStatsSchema], default: [] },
    },
    contestHistory: { type: [contestSchema], default: [] },
    solvedProblems: { type: [solvedProblemSchema], default: [] },
    recentSubmissions: { type: [recentSubmissionSchema], default: [] },
    syncedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);

userSchema.index({ 'dsaProfile.topics.name': 1 });
userSchema.index({ 'solvedProblems.platform': 1, 'solvedProblems.problemId': 1 });

export const User =
  mongoose.models.User ?? mongoose.model('User', userSchema, 'users');
