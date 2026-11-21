-- Mustang City seed. Idempotent (ON CONFLICT DO NOTHING).
-- Coordinates are approximate: verify each spot on the map before the Saturday walk.

-- Landmark missions (verified facts from docs/product-brief.md). Gemini may restyle `brief`
-- but must not add facts.
INSERT INTO missions (slug, title, briefing, type, lat, lng, radius_m, criteria, rep_reward, is_official, category, brief, year, source_url) VALUES
('banting-house', 'The Idea That Changed Medicine', 'The Goose wants proof you paid respects to the doctor. Find the statue.', 'photo',
  42.9926, -81.2398, 75, 'Photo shows the Frederick Banting statue or Banting House exterior.', 100, true,
  'history', 'Here, early on October 31, 1920, Frederick Banting had the idea that led to insulin; it is now a National Historic Site with a statue of him outside.', 1920,
  'https://parks.canada.ca/lhn-nhs/on/banting'),
('eldon-house', 'Oldest House in Forest State', 'Some places remember everything. Get a shot of the oldest one.', 'photo',
  42.9862, -81.2522, 75, 'Photo shows Eldon House, a historic white two-storey house, or its grounds in Harris Park.', 100, true,
  'history', 'Built in 1834 by Captain John Harris; London''s oldest remaining house, given to the city in 1959.', 1834,
  'https://en.wikipedia.org/wiki/Eldon_House'),
('changeling-richmond', 'Fake New York', 'For one summer this block played another city. Match the angle.', 'photo',
  42.9845, -81.2480, 100, 'Photo shows a downtown street with storefronts on Richmond Street.', 100, true,
  'film_tv', 'In August 2022 the Apple TV+ series The Changeling turned a block of Richmond Street into 1980s New York City.', 2022,
  'https://www.cbc.ca/news/canada/london'),
('fubar-fanshawe', 'Action Star Was Here', 'A very famous action hero filmed out here. Find the water.', 'checkin',
  43.0360, -81.1830, 250, 'User is at Fanshawe Conservation Area.', 100, true,
  'film_tv', 'Arnold Schwarzenegger filmed Netflix''s FUBAR season 2 here.', NULL,
  'https://www.londontourism.ca'),
('labatt-park', 'Little League Legends', 'Oldest ballpark vibes. Get the diamond in frame.', 'photo',
  42.9850, -81.2577, 100, 'Photo shows the baseball diamond, grandstand or entrance of Labatt Memorial Park.', 100, true,
  'film_tv', 'The little league baseball movie You Gotta Believe filmed here.', NULL,
  'https://globalnews.ca'),
('amazing-race-thames', 'Race Leg on the Thames', 'A reality race came through campus. Get to the river.', 'photo',
  43.0072, -81.2787, 120, 'Photo shows the Thames River near Western campus.', 100, true,
  'film_tv', 'The Amazing Race Canada season 8, episode 6 ran a full leg in London, including downtown, the Thames River and Western''s campus.', NULL,
  'https://www.filmlondon.ca')
ON CONFLICT (slug) DO NOTHING;

-- Starter missions around Mustang City.
INSERT INTO missions (slug, title, briefing, type, lat, lng, radius_m, criteria, rep_reward, is_official) VALUES
('middlesex-study-spot', 'The Secret Study Spot', 'There''s a quiet corner in Middlesex nobody talks about. Find it.', 'photo',
  43.0092, -81.2707, 60, 'Photo shows an indoor study space inside a stone university building.', 100, true),
('goose-sighting', 'Meet The Family', 'The Goose has cousins everywhere. Photograph one. Keep your distance.', 'photo',
  43.0096, -81.2737, 400, 'Photo clearly shows at least one Canada goose.', 100, true),
('uc-hill-summit', 'King of the Hill', 'Stand at the top of UC Hill and look over your kingdom.', 'photo',
  43.0089, -81.2737, 60, 'Photo taken from the top of a grassy hill looking over a university campus.', 100, true),
('the-spoke', 'Find The Spoke', 'Every crew needs a hangout. Locate The Spoke.', 'checkin',
  43.0080, -81.2752, 50, 'User is at The Spoke cafe in the University Community Centre.', 100, true),
('old-east-bus', 'Ride East', 'Take a bus to Old East Village. Don''t walk. The Goose will know.', 'bus',
  42.9890, -81.2230, 150, 'User arrives in Old East Village by bus.', 150, true),
('gates-of-western', 'The Gates', 'Every legend starts at the gates. Get the arch in frame.', 'photo',
  43.0052, -81.2683, 80, 'Photo shows the stone entrance gates of Western University.', 100, true),
('weldon-night', 'Library After Dark', 'Weldon never sleeps. Prove it after 10pm.', 'checkin',
  43.0098, -81.2754, 60, 'User is at Weldon Library.', 100, true),
('richmond-row', 'Strip Patrol', 'Walk the Row. Find the busiest corner.', 'checkin',
  42.9935, -81.2510, 120, 'User is on Richmond Row.', 100, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO badges (code, name, description) VALUES
('goose-whisperer', 'Goose Whisperer', 'Photograph geese for 5 missions'),
('night-owl', 'Night Owl', 'Complete the Middlesex College study-spot mission after midnight'),
('route-6-regular', 'Route 6 Regular', 'Ride the same route on 10 different days'),
('every-route', 'Every Route', 'Ride all LTC routes'),
('cartographer', 'Cartographer', 'Explore 25% of London'),
('heister', 'Heister', 'Complete 3 heists')
ON CONFLICT (code) DO NOTHING;
