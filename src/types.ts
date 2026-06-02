export enum DietaryPreference {
  VEG = "Veg",
  NON_VEG = "Non-Veg",
  VEGAN = "Vegan",
  JAIN = "Jain",
  EGGETARIAN = "Eggetarian"
}

export enum FitnessGoal {
  WEIGHT_LOSS = "Weight Loss",
  WEIGHT_GAIN = "Weight Gain",
  FAT_LOSS = "Fat Loss",
  MUSCLE_GAIN = "Muscle Gain",
  HEALTHY_EATING = "Healthy Eating"
}

export enum ActivityLevel {
  SEDENTARY = "Sedentary (Little to no exercise)",
  MODERATE = "Moderate (Active 3-5 days/week)",
  ACTIVE = "Highly Active (Heavy exercise daily)"
}

export interface UserProfile {
  age: number;
  gender: string;
  weight: number; // in kg
  height: number; // in cm
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  dietaryPreference: DietaryPreference;
  medicalConditions: string[]; // e.g., ["Diabetes", "Thyroid", "PCOS", "None"]
  allergies: string;
}

export interface GroundingChunk {
  id: string;
  sourceName: string;
  text: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  summary?: string;
  explanation?: string;
  recommendations?: string[];
  sources?: string[];
  confidence?: "High" | "Medium" | "Low";
  isEmergencyRedirect?: boolean;
}

export interface IndexDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  chunkCount: number;
  uploadDate: string;
  status: "Ready" | "Processing" | "Failed";
}

export interface NutritionMetrics {
  recommendedCalories: number;
  proteinGrams: number;
  waterLiters: number;
  cerealLimitGrams: number;
  bmi: number;
  bmiCategory: string;
  insights: string[];
}
