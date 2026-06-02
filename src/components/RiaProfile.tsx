import React from "react";
import { UserProfile, DietaryPreference, FitnessGoal, ActivityLevel, NutritionMetrics } from "../types";
import { User, Activity, ShieldAlert, Heart } from "lucide-react";

interface ProfileProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
  metrics: NutritionMetrics;
  hasCalculatedBmi: boolean;
  onCalculate: () => void;
  onResetBmi: () => void;
}

export default function RiaProfile({ profile, onChange, metrics, hasCalculatedBmi, onCalculate, onResetBmi }: ProfileProps) {
  const handleChange = (key: keyof UserProfile, value: any) => {
    if (key === "height" || key === "weight") {
      onResetBmi();
    }
    onChange({
      ...profile,
      [key]: value
    });
  };

  const handleCheckboxChange = (condition: string, checked: boolean) => {
    let current = [...profile.medicalConditions];
    if (checked) {
      if (condition === "None") {
        current = ["None"];
      } else {
        current = current.filter(c => c !== "None");
        if (!current.includes(condition)) {
          current.push(condition);
        }
      }
    } else {
      current = current.filter(c => c !== condition);
      if (current.length === 0) current.push("None");
    }
    handleChange("medicalConditions", current);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
        <User className="text-teal-500 w-5 h-5" />
        <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">Your Health Profile</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Age */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Age (18 - 60)</label>
          <input
            type="number"
            min="18"
            max="60"
            value={profile.age}
            onChange={(e) => handleChange("age", Math.max(18, Math.min(60, Number(e.target.value))))}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
          <select
            value={profile.gender}
            onChange={(e) => handleChange("gender", e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
          >
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary">Non-binary</option>
          </select>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Weight (kg)</label>
          <input
            type="number"
            value={profile.weight}
            onChange={(e) => handleChange("weight", Number(e.target.value))}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Height */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Height (cm)</label>
          <input
            type="number"
            value={profile.height}
            onChange={(e) => handleChange("height", Number(e.target.value))}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Activity Level */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Activity Metric</label>
          <div className="flex flex-col space-y-2">
            {Object.values(ActivityLevel).map((act) => (
              <label
                key={act}
                className={`flex items-center space-x-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                  profile.activityLevel === act
                    ? "bg-teal-50 border-teal-500/30 text-teal-750 font-semibold"
                    : "bg-white border-slate-201 text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="activityLevel"
                  checked={profile.activityLevel === act}
                  onChange={() => handleChange("activityLevel", act)}
                  className="hidden"
                />
                <Activity className={`w-4 h-4 ${profile.activityLevel === act ? "text-teal-600" : "text-slate-500"}`} />
                <span>{act}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Diet Preference */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Food Habit</label>
          <select
            value={profile.dietaryPreference}
            onChange={(e) => handleChange("dietaryPreference", e.target.value as DietaryPreference)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
          >
            {Object.values(DietaryPreference).map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
        </div>

        {/* Goal */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Activity Goal</label>
          <select
            value={profile.goal}
            onChange={(e) => handleChange("goal", e.target.value as FitnessGoal)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
          >
            {Object.values(FitnessGoal).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Allergies / Food Restrictions */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Allergies / Exclusions</label>
          <input
            type="text"
            placeholder="e.g., Peanuts, Dairy, Gluten, None"
            value={profile.allergies}
            onChange={(e) => handleChange("allergies", e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-400"
          />
        </div>

        {/* Medical Conditions */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Medical Profile Indications</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {["None", "Diabetes", "PCOS", "Thyroid", "Hypertension"].map((cond) => {
              const isChecked = profile.medicalConditions.includes(cond);
              return (
                <label
                  key={cond}
                  className={`flex items-center space-x-2 text-xs p-2 rounded-lg cursor-pointer border transition-colors ${
                    isChecked
                      ? "bg-teal-50 border-teal-300 text-teal-700 font-medium font-semibold"
                      : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(cond, e.target.checked)}
                    className="accent-teal-600 rounded border-slate-300 text-teal-600"
                  />
                  <span>{cond}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Calculate BMI button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onCalculate}
          className="w-full text-xs font-bold py-3.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl transition-all shadow-md hover:shadow-teal-900/10 flex items-center justify-center space-x-2 select-none"
        >
          <span>Calculate BMI</span>
        </button>
      </div>

      {/* Localized Metrics Summary Inside Profile */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">BMI Analysis</span>
          {hasCalculatedBmi ? (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              metrics.bmiCategory === "Normal" ? "bg-teal-500/10 text-teal-600 border border-teal-505/20" : "bg-amber-500/10 text-amber-600 border border-amber-505/20"
            }`}>
              {metrics.bmi.toFixed(1)} | {metrics.bmiCategory}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 border border-slate-300 font-medium font-sans animate-pulse">
              Awaiting Calculation
            </span>
          )}
        </div>

        {hasCalculatedBmi ? (
          <div className="text-[11px] text-slate-600 leading-relaxed space-y-1">
            <div className="flex items-start space-x-1.5">
              <Heart className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
              <p>
                <strong>Sharma et al. Target correction:</strong> Your BMI is calculated as <strong>{metrics.bmi.toFixed(1)}</strong> ({metrics.bmiCategory}). Elevation of your protein allocation to {metrics.proteinGrams}g corrects standard micro-nutrient deficits in Indian households.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 italic">
            Enter your height & weight above, then click the "Calculate BMI" button to load your body status details.
          </p>
        )}
      </div>
    </div>
  );
}
