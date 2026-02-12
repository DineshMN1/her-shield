'use client';

import { useState } from 'react';
import { ArrowLeft, Apple, Droplets, Egg, Wheat, Fish, Milk, Leaf, AlertTriangle, Check } from 'lucide-react';
import Link from 'next/link';
import { useRequirePatient } from '@/lib/useAuth';

interface NutrientInfo {
  name: string;
  daily: string;
  foods: string[];
  icon: string;
  color: string;
  importance: string;
}

const TRIMESTER_NUTRITION: Record<string, { title: string; description: string; calories: string; keyNutrients: NutrientInfo[] }> = {
  '1': {
    title: 'First Trimester (Weeks 1-12)',
    description: 'Focus on folic acid, vitamin B6 for nausea, and staying hydrated. Eat small frequent meals.',
    calories: '1,800 kcal/day',
    keyNutrients: [
      { name: 'Folic Acid', daily: '600 mcg', foods: ['Spinach', 'Lentils', 'Fortified cereals', 'Oranges', 'Broccoli'], icon: 'leaf', color: 'green', importance: 'Prevents neural tube defects' },
      { name: 'Iron', daily: '27 mg', foods: ['Red meat', 'Spinach', 'Beans', 'Tofu', 'Dried fruits'], icon: 'droplets', color: 'red', importance: 'Prevents anemia, supports blood volume' },
      { name: 'Vitamin B6', daily: '1.9 mg', foods: ['Bananas', 'Potatoes', 'Chicken', 'Fish', 'Chickpeas'], icon: 'apple', color: 'yellow', importance: 'Reduces morning sickness' },
      { name: 'Vitamin D', daily: '600 IU', foods: ['Sunlight', 'Fortified milk', 'Eggs', 'Fatty fish', 'Mushrooms'], icon: 'egg', color: 'orange', importance: 'Calcium absorption, bone health' },
    ],
  },
  '2': {
    title: 'Second Trimester (Weeks 13-26)',
    description: 'Baby is growing rapidly. Increase calcium, protein, and omega-3 intake. Appetite usually improves.',
    calories: '2,200 kcal/day',
    keyNutrients: [
      { name: 'Calcium', daily: '1,000 mg', foods: ['Milk', 'Yogurt', 'Cheese', 'Ragi', 'Almonds', 'Tofu'], icon: 'milk', color: 'blue', importance: 'Baby bone & teeth development' },
      { name: 'Protein', daily: '75-100g', foods: ['Eggs', 'Chicken', 'Dal', 'Paneer', 'Fish', 'Nuts'], icon: 'egg', color: 'amber', importance: 'Baby growth, tissue repair' },
      { name: 'Omega-3 (DHA)', daily: '200-300 mg', foods: ['Salmon', 'Sardines', 'Walnuts', 'Flaxseeds', 'Chia seeds'], icon: 'fish', color: 'cyan', importance: 'Baby brain & eye development' },
      { name: 'Fiber', daily: '28g', foods: ['Whole grains', 'Fruits', 'Vegetables', 'Oats', 'Brown rice'], icon: 'wheat', color: 'brown', importance: 'Prevents constipation' },
    ],
  },
  '3': {
    title: 'Third Trimester (Weeks 27-40)',
    description: 'Baby gains most weight now. Focus on iron, calcium, vitamin K, and energy-rich foods. Eat smaller, frequent meals.',
    calories: '2,400 kcal/day',
    keyNutrients: [
      { name: 'Iron', daily: '27 mg', foods: ['Red meat', 'Spinach', 'Beetroot', 'Pomegranate', 'Jaggery'], icon: 'droplets', color: 'red', importance: 'Prepares for delivery blood loss' },
      { name: 'Calcium', daily: '1,200 mg', foods: ['Milk', 'Curd', 'Cheese', 'Sesame seeds', 'Green leafy veg'], icon: 'milk', color: 'blue', importance: 'Baby skeleton hardening' },
      { name: 'Vitamin K', daily: '90 mcg', foods: ['Spinach', 'Kale', 'Broccoli', 'Brussels sprouts', 'Green peas'], icon: 'leaf', color: 'green', importance: 'Blood clotting for delivery' },
      { name: 'Vitamin C', daily: '85 mg', foods: ['Oranges', 'Guava', 'Amla', 'Bell peppers', 'Tomatoes'], icon: 'apple', color: 'orange', importance: 'Iron absorption, immunity' },
    ],
  },
};

const DAILY_MEAL_PLAN = [
  { time: '7:00 AM', meal: 'Early Morning', items: ['Warm water with lemon', 'Soaked almonds (5-6)', 'Dates (2-3)'], color: 'amber' },
  { time: '8:00 AM', meal: 'Breakfast', items: ['Ragi/oats porridge with milk', 'Boiled egg or paneer', 'Fresh fruit'], color: 'green' },
  { time: '10:30 AM', meal: 'Mid-Morning', items: ['Fruit salad or smoothie', 'Handful of nuts', 'Buttermilk/lassi'], color: 'blue' },
  { time: '1:00 PM', meal: 'Lunch', items: ['Brown rice/roti (2)', 'Dal/sambar', 'Sabzi (green vegetables)', 'Curd', 'Salad'], color: 'orange' },
  { time: '4:00 PM', meal: 'Evening Snack', items: ['Sprouts chaat or sandwich', 'Green tea or milk', 'Dry fruits'], color: 'purple' },
  { time: '7:30 PM', meal: 'Dinner', items: ['Roti/chapati (2)', 'Light sabzi', 'Dal or chicken curry', 'Salad'], color: 'pink' },
  { time: '9:30 PM', meal: 'Bedtime', items: ['Warm milk with turmeric', 'A banana or handful of walnuts'], color: 'indigo' },
];

const FOODS_TO_AVOID = [
  { name: 'Raw/undercooked meat & eggs', reason: 'Risk of Salmonella, Toxoplasma' },
  { name: 'Unpasteurized milk & cheese', reason: 'Risk of Listeria infection' },
  { name: 'Raw papaya & pineapple', reason: 'May cause uterine contractions' },
  { name: 'High mercury fish (shark, swordfish)', reason: 'Mercury affects baby brain development' },
  { name: 'Excess caffeine (>200mg/day)', reason: 'Increases miscarriage risk' },
  { name: 'Alcohol', reason: 'Causes fetal alcohol syndrome' },
  { name: 'Processed/junk food', reason: 'Empty calories, high sodium' },
  { name: 'Ajinomoto (MSG)', reason: 'May affect baby development' },
];

const SUPERFOODS = [
  { name: 'Spinach (Palak)', benefit: 'Rich in iron, folic acid, calcium', emoji: '🥬' },
  { name: 'Sweet Potato', benefit: 'Vitamin A, fiber, energy', emoji: '🍠' },
  { name: 'Eggs', benefit: 'Complete protein, choline for brain', emoji: '🥚' },
  { name: 'Greek Yogurt', benefit: 'Calcium, probiotics, protein', emoji: '🥛' },
  { name: 'Salmon', benefit: 'Omega-3 DHA, protein, Vitamin D', emoji: '🐟' },
  { name: 'Lentils (Dal)', benefit: 'Folate, iron, protein, fiber', emoji: '🫘' },
  { name: 'Avocado', benefit: 'Healthy fats, folate, potassium', emoji: '🥑' },
  { name: 'Berries', benefit: 'Antioxidants, vitamin C, fiber', emoji: '🫐' },
  { name: 'Walnuts', benefit: 'Omega-3, brain food, protein', emoji: '🥜' },
  { name: 'Ragi (Finger Millet)', benefit: 'Calcium, iron, amino acids', emoji: '🌾' },
];

const iconMap: Record<string, React.ElementType> = {
  leaf: Leaf,
  droplets: Droplets,
  apple: Apple,
  egg: Egg,
  milk: Milk,
  fish: Fish,
  wheat: Wheat,
};

const colorMap: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  brown: 'bg-orange-100 text-orange-800',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

export default function NutritionPage() {
  const { loading } = useRequirePatient();
  const [selectedTrimester, setSelectedTrimester] = useState('1');
  const [activeTab, setActiveTab] = useState<'plan' | 'nutrients' | 'superfoods' | 'avoid'>('plan');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  const trimester = TRIMESTER_NUTRITION[selectedTrimester];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/mother">
              <ArrowLeft className="w-5 h-5 text-gray-600 hover:text-gray-900 cursor-pointer" />
            </Link>
            <div>
              <h1 className="font-bold text-lg">Pregnancy Nutrition Guide</h1>
              <p className="text-xs text-gray-500">Eat right for you and your baby</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Trimester Selector */}
        <div className="flex gap-2 mb-6">
          {['1', '2', '3'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTrimester(t)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                selectedTrimester === t
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-200'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Trimester {t}
            </button>
          ))}
        </div>

        {/* Trimester Info */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 mb-6">
          <h2 className="font-bold text-lg">{trimester.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{trimester.description}</p>
          <div className="mt-3 inline-flex items-center bg-white px-3 py-1.5 rounded-full">
            <span className="text-sm font-medium text-pink-600">Recommended: {trimester.calories}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 shadow-sm">
          {[
            { key: 'plan', label: 'Meal Plan' },
            { key: 'nutrients', label: 'Nutrients' },
            { key: 'superfoods', label: 'Superfoods' },
            { key: 'avoid', label: 'Avoid' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Daily Meal Plan */}
        {activeTab === 'plan' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Daily Meal Plan</h3>
            {DAILY_MEAL_PLAN.map((meal, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${colorMap[meal.color] || 'bg-gray-100 text-gray-700'}`}>
                      {meal.time.split(':')[0]}
                    </div>
                    <div>
                      <p className="font-medium">{meal.meal}</p>
                      <p className="text-xs text-gray-500">{meal.time}</p>
                      <ul className="mt-2 space-y-1">
                        {meal.items.map((item, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nutrients */}
        {activeTab === 'nutrients' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">Key Nutrients - {trimester.title}</h3>
            {trimester.keyNutrients.map((nutrient, idx) => {
              const IconComp = iconMap[nutrient.icon] || Apple;
              return (
                <div key={idx} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[nutrient.color] || 'bg-gray-100'}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{nutrient.name}</p>
                        <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-full">{nutrient.daily}/day</span>
                      </div>
                      <p className="text-xs text-pink-600 mt-0.5">{nutrient.importance}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {nutrient.foods.map((food, i) => (
                          <span key={i} className="text-xs bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
                            {food}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Superfoods */}
        {activeTab === 'superfoods' && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Pregnancy Superfoods</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUPERFOODS.map((food, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <span className="text-2xl">{food.emoji}</span>
                  <div>
                    <p className="font-medium text-sm">{food.name}</p>
                    <p className="text-xs text-gray-500">{food.benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Foods to Avoid */}
        {activeTab === 'avoid' && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Foods to Avoid During Pregnancy</h3>
            <div className="space-y-3">
              {FOODS_TO_AVOID.map((food, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3">
                  <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{food.name}</p>
                    <p className="text-xs text-red-600">{food.reason}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="font-medium text-amber-800 text-sm mb-2">Important Note</h4>
              <p className="text-xs text-amber-700">
                This is general guidance. Always consult your doctor for personalized dietary advice,
                especially if you have gestational diabetes, pre-eclampsia, or any other condition.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
