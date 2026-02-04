import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUESTIONS = [
  { id: 'age', q: 'What is your current age?', type: 'number' },
  { id: 'style', q: 'Are you a trader (short-term) or investor (long-term)?', type: 'select', options: ['Trader', 'Investor'] },
  { id: 'horizon', q: 'How long do you plan to hold your investments?', type: 'select', options: ['< 1 year', '1-5 years', '5-10 years', '10+ years'] },
  { id: 'reaction', q: 'If your portfolio dropped 20% tomorrow, you would...', type: 'select', options: ['Sell everything', 'Sell some', 'Hold', 'Buy more'] },
  { id: 'goal', q: 'What is your primary financial goal?', type: 'text', placeholder: 'e.g. Retirement, Buying a house...' }
];

const RiskAssessmentTool = ({ portfolios }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleNext = () => step < QUESTIONS.length - 1 ? setStep(s => s + 1) : submitAnalysis();
  
  const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  
  // Development/localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // Production - your domain
  if (hostname === 'aurum-au.com' || hostname === 'www.aurum-au.com') {
    return 'https://aurum-au.com';
  }
  
  // For Render/other hosting
  if (hostname.includes('onrender.com')) {
    return `https://${hostname}`;
  }
  
  // Default to current host
  return window.location.origin;
};


  const submitAnalysis = async () => {
    setLoading(true);
    const apiBaseUrl = getApiBaseUrl();
    const apiUrl = `${apiBaseUrl}/analyze-risk`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, portfolio: portfolios })
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      alert("Analysis failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aurum-card p-8 rounded-3xl max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 gold-text">Risk Strategy Workshop</h2>
      
      {!result ? (
        <div className="space-y-6">
          <div className="mb-4 text-xs text-zinc-500 uppercase tracking-widest">
            Question {step + 1} of {QUESTIONS.length}
          </div>
          
          <h3 className="text-xl font-medium mb-4">{QUESTIONS[step].q}</h3>
          
          {QUESTIONS[step].type === 'select' ? (
            <div className="grid grid-cols-1 gap-3">
              {QUESTIONS[step].options.map(opt => (
                <button 
                  key={opt}
                  onClick={() => { setAnswers({...answers, [QUESTIONS[step].id]: opt}); handleNext(); }}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-[#D3AC2C] transition-all text-left"
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input 
              type={QUESTIONS[step].type}
              className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-[#D3AC2C]"
              onChange={(e) => setAnswers({...answers, [QUESTIONS[step].id]: e.target.value})}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            />
          )}

          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(s => Math.max(0, s-1))} className="text-zinc-500 text-sm">Back</button>
            {QUESTIONS[step].type !== 'select' && (
              <button onClick={handleNext} className="bg-[#D3AC2C] text-black px-6 py-2 rounded-lg font-bold">
                {step === QUESTIONS.length - 1 ? 'Analyze' : 'Next'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="p-4 bg-[#D3AC2C]/10 border border-[#D3AC2C]/30 rounded-2xl">
            <h4 className="text-[#D3AC2C] font-bold text-sm uppercase mb-2">AI Verdict</h4>
            <p className="text-sm leading-relaxed text-zinc-300">
              {result.verdict?.slice(0, 150)}... {/* 150 word cap */}
            </p>
          </div>
          {/* Display logic for targets and actions */}
        </motion.div>
      )}
    </div>
  );
};

export default RiskAssessmentTool;