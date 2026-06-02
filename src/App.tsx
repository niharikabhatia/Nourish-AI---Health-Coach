import React, { useState, useMemo } from "react";
import { UserProfile, DietaryPreference, FitnessGoal, ActivityLevel, NutritionMetrics } from "./types";
import RiaProfile from "./components/RiaProfile";
import KnowledgeBase from "./components/KnowledgeBase";
import RiaChat from "./components/RiaChat";
import { MessageSquareText, UserCog, LibraryBig, HeartHandshake } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "profile" | "knowledge">("chat");
  const [hasCalculatedBmi, setHasCalculatedBmi] = useState<boolean>(false);

  // Global user demographic state matching Indian contexts
  const [profile, setProfile] = useState<UserProfile>({
    age: 26,
    gender: "Female",
    weight: 62,
    height: 165,
    activityLevel: ActivityLevel.MODERATE,
    goal: FitnessGoal.HEALTHY_EATING,
    dietaryPreference: DietaryPreference.VEG,
    medicalConditions: ["None"],
    allergies: ""
  });

  // Calculate dynamic nutritional and clinical targets
  const metrics = useMemo<NutritionMetrics>(() => {
    const age = Number(profile.age);
    const weight = Number(profile.weight);
    const height = Number(profile.height);
    const goal = profile.goal;

    // Calculate exact BMI
    const heightM = height / 100;
    const bmi = height > 0 ? weight / (heightM * heightM) : 0;
    let bmiCategory = "Normal";
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi >= 25 && bmi < 30) bmiCategory = "Overweight";
    else if (bmi >= 30) bmiCategory = "Obese";

    // Standard BMR via Mifflin-St Jeor equation
    let bCal = profile.gender === "Male"
      ? Math.round(10 * weight + 6.25 * height - 5 * age + 5)
      : Math.round(10 * weight + 6.25 * height - 5 * age - 161);

    // Apply activity offsets corresponding to NSO benchmarks
    if (profile.activityLevel === ActivityLevel.ACTIVE) bCal = Math.round(bCal * 1.5);
    else if (profile.activityLevel === ActivityLevel.MODERATE) bCal = Math.round(bCal * 1.3);
    else bCal = Math.round(bCal * 1.15);

    // Goal multipliers
    if (goal === FitnessGoal.WEIGHT_LOSS || goal === FitnessGoal.FAT_LOSS) {
      bCal -= 400;
    } else if (goal === FitnessGoal.WEIGHT_GAIN || goal === FitnessGoal.MUSCLE_GAIN) {
      bCal += 300;
    }

    // Protein Target: safe elevated RDA to bypass default low-protein Indian bases (Sharma et al. 2020)
    const targetProtein = Math.round(weight * (goal === FitnessGoal.MUSCLE_GAIN ? 1.6 : 1.2));
    const targetWater = height > 165 ? 3.0 : 2.5;

    // Carb limitation caps: capping cereal starches, preventing the 51-65% cereal baseline (NSO Report 594)
    const cerealLimit = Math.round((bCal * 0.40) / 4);

    const insights = [
      `Custom daily protein target set at ${targetProtein}g to bypass the standard 6-8% protein gap identified in Indian households (Sharma et al., 2020).`,
      `Traditional daily cereal allocation capped at ${cerealLimit}g to maintain a stable glucose curve vs the typical Indian starch baseline (NSO NSS Report No. 594)`,
      `Socioeconomic NSO benchmarks indicate a balanced daily caloric intake target of ${profile.gender === "Male" ? "2240" : "2212"} kcal.`
    ];

    if (profile.medicalConditions.includes("Diabetes")) {
      insights.push("Indication profile mapped (Diabetes): Swastika strictly enforces complex slow-release carbohydrates (ragi, barley, oat meal, bajra) instead of white rice.");
    }
    if (profile.medicalConditions.includes("PCOS") || profile.medicalConditions.includes("Thyroid")) {
      insights.push("Hormonal health indications detected: Recommending optimal selenium bases, leafy micro-nutrients, and lean proteins while excluding high-processed starches.");
    }
    if (profile.allergies.trim().length > 0 && !profile.allergies.toLowerCase().includes("none")) {
      insights.push(`Exclusion safeguard active: Swastika identifies and removes recipes with indications matching [${profile.allergies}].`);
    }

    return {
      recommendedCalories: Math.max(1200, bCal),
      proteinGrams: targetProtein,
      waterLiters: targetWater,
      cerealLimitGrams: cerealLimit,
      bmi,
      bmiCategory,
      insights
    };
  }, [profile]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans leading-normal selection:bg-teal-600/20">
      {/* Premium Header Layout */}
      <header className="bg-white/90 border-b border-slate-200/80 backdrop-blur-lg sticky top-0 z-50 px-6 py-4.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="bg-gradient-to-tr from-teal-500 to-cyan-600 p-2.5 rounded-2xl shadow-lg shadow-teal-900/10 shrink-0">
              <HeartHandshake className="text-white w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">Nourish AI</h1>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-700 border border-teal-200/50 px-2 py-0.5 rounded-full select-none uppercase tracking-wide">Swastika Edition</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Evidence-Grounded Personal Nutrition Platform & health coach</p>
            </div>
          </div>

          {/* Navigation Tab controllers */}
          <nav className="flex items-center space-x-1 border border-slate-200 bg-white/80 p-1.5 rounded-xl shadow-sm">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors select-none ${
                activeTab === "chat"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <MessageSquareText className="w-4 h-4" />
              <span>Coach Swastika</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors select-none ${
                activeTab === "profile"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <UserCog className="w-4 h-4" />
              <span>Your BMI Analysis</span>
            </button>

            <button
              onClick={() => setActiveTab("knowledge")}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors select-none ${
                activeTab === "knowledge"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LibraryBig className="w-4 h-4" />
              <span>KB Admin</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Primary body view content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Wholesome Healthy Lifestyle Illustration Banner matching user uploaded artifact */}
        <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-gradient-to-r from-emerald-50/10 via-teal-50/20 to-sky-50/30 h-36 sm:h-44 md:h-48 transition-all duration-300">
          <img
            src="https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?auto=format&fit=crop&q=80&w=1200"
            alt="Warm Healthy Lifestyle Watercolor Flatlay"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-85 object-center mix-blend-multiply md:mix-blend-normal"
          />
          {/* Symmetrical white/teal wash on left side to guarantee high-contrast text rendering */}
          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-white/95 via-white/80 to-transparent sm:from-white/90"></div>
          
          <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-8 text-left max-w-xl">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-teal-800 bg-teal-100/80 border border-teal-200/50 px-2.5 py-1 rounded-full w-fit">
              Daily Nutrition & Balanced Living Guide
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-2.5 font-display">
              Nourish & Thrive Everyday
            </h2>
            <p className="text-xs text-slate-600 mt-1 font-semibold leading-relaxed max-w-md hidden sm:block">
              Welcome to your premium health suite. Coach Swastika cross-references clinical nutrition guidelines to calculate and help you maintain your ideal metrics.
            </p>
          </div>
        </div>

        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Section: Coach Swastika Portrait & Key Bio-Metrics */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-slate-200/85 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                {/* Clean Header Area (Without Image) */}
                <div className="bg-slate-50/70 border-b border-slate-100 p-6 text-left">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-teal-700">Evidence Guided AI</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight mt-1.5 text-slate-900 font-display">Swastika: Your Health AI Coach</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans font-medium">Your AI Nutrition, Fitness & Lifestyle Guide</p>
                </div>

                {/* Profile detail tags */}
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Scientific Mission</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Providing Indian users with safe, evidence-based nutrition designs and corrective lifestyle decisions using clinical archives.
                    </p>
                  </div>

                  {/* Calculated metrics widget in the sidebar */}
                  <div className="border-t border-slate-100 pt-4.5 space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculated Targets</h4>
                    <div className="grid grid-cols-2 gap-2 text-left w-full">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                        <span className="block text-[9px] text-slate-400 font-extrabold uppercase">Calorie Target</span>
                        <span className="font-mono text-xs font-bold text-slate-800">{metrics.recommendedCalories} kcal</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                        <span className="block text-[9px] text-slate-400 font-extrabold uppercase">Protein RDA</span>
                        <span className="font-mono text-xs font-bold text-slate-800">{metrics.proteinGrams}g</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                        <span className="block text-[9px] text-slate-400 font-extrabold uppercase">Water Hydration</span>
                        <span className="font-mono text-xs font-bold text-slate-800">{metrics.waterLiters} L</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                        <span className="block text-[9px] text-slate-400 font-extrabold uppercase">Cereal Starch Cap</span>
                        <span className="font-mono text-xs font-bold text-slate-800">{metrics.cerealLimitGrams}g</span>
                      </div>
                    </div>
                  </div>

                  {/* Active safeguards summary snippet */}
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50/50 border border-teal-100 rounded-xl p-3 text-left">
                    <div className="flex items-start space-x-2 text-[11px] text-teal-800 leading-normal">
                      <span className="mt-0.5 select-none font-bold text-teal-500">🛡️</span>
                      <p className="font-medium">Active limits prevent carbohydrate excesses (NSO Report 594) and traditional protein shortages.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("profile")}
                    className="w-full text-xs font-bold py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all shadow-sm hover:shadow-teal-900/10"
                  >
                    Personalize Health Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Right Section: Conversational AI Trainer Panel */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-left">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-950 font-sans tracking-tight">Active Dialogue with Swastika</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Unlike generalized chatbots, Swastika cross-validates advice against the <strong>EAT-Lancet Indian Comparison</strong> & <strong>NSO NSS Report No. 594</strong>.
                  </p>
                </div>
                <div className="flex items-center space-x-2 border border-teal-100 px-3 py-1.5 rounded-xl bg-teal-50/50 shrink-0">
                  <span className="text-[10px] text-teal-800 font-mono font-bold select-none uppercase tracking-wide">Emergency Safeguards: Active</span>
                </div>
              </div>
              <RiaChat profile={profile} metrics={metrics} />
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <RiaProfile
                profile={profile}
                onChange={setProfile}
                metrics={metrics}
                hasCalculatedBmi={hasCalculatedBmi}
                onCalculate={() => setHasCalculatedBmi(true)}
                onResetBmi={() => setHasCalculatedBmi(false)}
              />
            </div>
            <div className="space-y-5">
              {/* BMI Range Reference Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4 font-sans">
                  BMI Range Reference
                </h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-100">
                    <span className="font-bold">Underweight</span>
                    <span className="font-mono font-bold">&lt; 18.5</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100">
                    <span className="font-bold">Normal</span>
                    <span className="font-mono font-bold">18.5 – 24.9</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-100">
                    <span className="font-bold">Overweight</span>
                    <span className="font-mono font-bold">25.0 – 29.9</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-100">
                    <span className="font-bold">Obese</span>
                    <span className="font-mono font-bold">≥ 30.0</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-teal-50/50 border border-teal-100 rounded-xl text-[10.5px] text-slate-600 leading-relaxed font-sans">
                  <p className="font-bold text-teal-800 mb-1">💡 South Asian Medical Note:</p>
                  Asian clinical reference thresholds dictate lower cutoff weights: Normal is <strong>18.5 – 22.9</strong>, Overweight: <strong>23.0 – 24.9</strong>, Obesity: <strong>≥ 25.0</strong>.
                </div>
              </div>

              {/* Calculations visible only if triggered */}
              {hasCalculatedBmi ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm fade-in">
                  <h3 className="text-xs font-bold text-slate-505 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">
                    Calculated Target Indicators
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Corrective Calories:</span>
                      <strong className="text-slate-800 font-mono font-bold text-sm">
                        {metrics.recommendedCalories} kcal
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Target RDA Protein:</span>
                      <strong className="text-slate-800 font-mono font-bold text-sm">
                        {metrics.proteinGrams}g
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-550">Cereal Limit (40% max):</span>
                      <strong className="text-slate-800 font-mono font-bold text-sm">
                        {metrics.cerealLimitGrams}g/day
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-550">Fluids Objective:</span>
                      <strong className="text-slate-800 font-mono font-bold text-sm">
                        {metrics.waterLiters}L
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 p-5 rounded-2xl text-center">
                  <p className="text-[11px] text-slate-400 italic">
                    Calculated dietary targets will populate here once you calculate your BMI in the profile form.
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-extrabold text-teal-700 uppercase tracking-widest mb-3">Coach Swastika Tip</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  "Your targets reflect corrections for the traditional Indian carbohydrate excess and typical protein shortfall. As you alter your goal or active parameters, your targets instantly recalculate so I can coach you with maximum numerical precision."
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "knowledge" && (
          <div className="max-w-4xl mx-auto">
            <KnowledgeBase />
          </div>
        )}
      </main>

      {/* Compact footer */}
      <footer className="border-t border-slate-200 pb-12 pt-6 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Nourish AI | Swastika AI Nutrition, Fitness, and Healthy Lifestyle Coach. Grounded references in NSO Report 594 & Indian clinical guidelines comparison.</p>
      </footer>
    </div>
  );
}
