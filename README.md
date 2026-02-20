DEMO: https://castlot-personal-prediction-market-virid.vercel.app/

Overview:

Castlot is a social, audio-first life forecasting platform where users talk about their real-life situations (career, academic, habits, relationships, etc.) and the community trades probability on the outcome as they help the user vote, trade, and comment on potential solutions or decisions. It transforms personal dilemmas into structured, time-bound prediction markets, building a reputation economy around forecasting accuracy. This is not Reddit where there's no rhetoric-based upvotes, nor Kalshi or Polymarket that are only global macro prediction markets, nor a podcast app (the audio is only input, not content).

Life gets confusing, Castlot clears it up. 

Core Product Loop: User narrates a real-life dilemma (30–120 sec voice memo), AI converts it into a structured binary prediction market, app generates an anonymous podcast-style experience, community trades probability (YES/NO shares), market resolves → reputations update. This is accountability infrastructure for real life. 

Tech Stack:
React + Vite (Frontend), JavaScript, Node.js + npm, Vercel (deployment)

Market Engine:
Castlot uses a Logarithmic Market Scoring Rule (LMSR) model with a sentiment anchoring phase.
Lifecycle: Creation → 10-min anchor window → Trading → Soft close → Resolution → Brier score update 
Virtual Currency to conduct initial user testing (Foresight Points - FP)
1,000 FP weekly allocation
20% decay on unused weekly FP
Earned FP does not decay
Two-tier currency: participation fuel + permanent reputation capital 

Reputation System:
Castlot is a forecasting reputation engine where users build status based on how well their predicted probabilities match real outcomes, measured primarily through Brier score. Reputation compounds over time through calibration accuracy, category-specific expertise, and tier progression—while overconfident, incorrect forecasts are penalized. 

MVP Scope (First 90 Days)
Voice → Market AI pipeline
Spotify-style audio + transcript UI
Story-style YES/NO trading interface
Self-resolution + lightweight verification
Brier score leaderboard 
No extra features. No feed clutter. No vanity metrics.

Launch Strategy (CMU First):
Initial launch targets Carnegie Mellon University due to:
High density of probabilistic thinkers
College being a time where people want more decision clarity
Tight social graph for rapid word-of-mouth saturation 


Success Metrics (90 Days):
500+ users
200+ DAU
100+ markets
15+ traders per market 


Castlot is both a prediction market and a behavioral accountability layer for Gen Z life decisions, turning anonymous advice into calibrated, reputation-backed probabilistic reasoning. Predication market data is often much more accurate because you put your money where your mouth is and is more telling of what will be the outcome in a given situation. The engagement mechanic is prediction markets. The long-term asset is forecasting reputation data. At scale, this becomes a decision intelligence layer, a talent signal, a behavioral underwriting primitive, a new social graph built on calibration and probabilities.

Put your crowd to work.
Life gets confusing, Castlot clears it up.
