-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE election_clubs (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  admin1 TEXT DEFAULT '',
  admin2 TEXT DEFAULT '',
  community TEXT DEFAULT '',
  vote TEXT DEFAULT NULL,
  vote_count INTEGER DEFAULT 0,
  allegiance TEXT DEFAULT NULL,
  coordinator TEXT DEFAULT '',
  follow_up TEXT DEFAULT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS but allow all operations with anon key (no auth needed for this app)
ALTER TABLE election_clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON election_clubs FOR ALL USING (true) WITH CHECK (true);

-- Seed all 36 clubs
INSERT INTO election_clubs (id, name, phone, email, admin1, admin2, community) VALUES
(1, 'Adastrians', '', '', 'Raheem Gilani', '', 'Pakistani'),
(2, 'Atmiya', '', '', 'Sanket Dobariya', 'Krutarth Rangunwala', 'Gujarati'),
(3, 'Bengal United', '', '', 'Mahfuz Chowdhury', 'Istiak Khan', 'Bengali'),
(4, 'Black Caps', '', '', 'Tejash Patel', '', 'Gujarati'),
(5, 'Brossard Warriors', '', '', '', '', ''),
(6, 'Canadian Tamil', '', '', '', '', 'Tamil'),
(7, 'CDN Stars', '', '', '', '', ''),
(8, 'Centennial', '', '', 'Pooran Ramkissoon', 'Rynell Rodrigues', 'Caribbean'),
(9, 'Cote Des Neiges', '', '', 'Vijithan Shanmuganathan', 'Kethees Thanabalasingham', 'Tamil'),
(10, 'Dragons', '(438) 356-4469', 'ali.xahid@gmail.com', 'Ali Zahid', 'Aneeq Sakrani', 'Pakistani'),
(11, 'Hindustan Hurricanes', '', '', 'Sri Harsha Sanagasetty', '', 'South Indian'),
(12, 'Indian Risers', '', '', 'Ayyappan Arunachalam', '', 'South Indian'),
(13, 'Kebec Ryders', '', '', 'Nimesh Patel', 'Ajay Patel', 'Gujarati'),
(14, 'KVSCM', '', '', 'PRITAM Patel', 'Mayur Patel', 'Gujarati'),
(15, 'LaSalle Strikers', '514-560-0650', 'ashirzamir23@gmail.com', 'Ashir Zamir', 'SHAHAB ZAMIR', 'Pakistani'),
(16, 'Laval Kings', '', '', 'Fahad Alvi', '', 'Pakistani'),
(17, 'Montreal Gladiators', '5145852137', 'omairsaeed499@gmail.com', '', '', 'Pakistani'),
(18, 'Montreal Knight Riders', '5148040591', 'mkriderscricket@gmail.com', 'Mandeep Singh', '', 'Punjabi'),
(19, 'Montreal Knights', '', '', '', '', ''),
(20, 'Montreal Mavericks', '', '', '', '', ''),
(21, 'Montreal United', '', '', 'Rajesh Sharma', 'Vinay HS', 'North Indian'),
(22, 'Pakistan Cricket Club', '', '', 'Adil Bhatti', 'Tahir Abbas Awana', 'Pakistani'),
(23, 'Primes', '', '', 'Haroon Syed', 'Faisal Munawar', 'Pakistani'),
(24, 'Punjab Lions', '', 'punjablions.cricket@gmail.com', 'Harsimranjit Singh Sindhar', 'Abhinav Singh', 'Punjabi'),
(25, 'Punjab Warriors', '', '', 'Gursimranjeet singh Tiwana', '', 'Punjabi'),
(26, 'Punjab XI', '', '', 'Deepak Chauhan', '', 'Punjabi'),
(27, 'QCF Masters', '5148250784', 'dalip@hotmail.com', 'Dalip Kirpaul', '', 'Caribbean'),
(28, 'Rive-Sud Rangers', '', '', '', '', ''),
(29, 'Royal CC', '', '', 'Ovais Moin', 'Saad Khan', 'Pakistani'),
(30, 'Sher E Punjab', '', '', 'Kamaljeet Parmar', '', 'Punjabi'),
(31, 'Sher-Dils', '', '', 'Lakshay Malhotra', '', 'North Indian'),
(32, 'Spartan Wizards', '', '', 'Chintan Acharya', '', 'Gujarati'),
(33, 'St. V. Mets', '', '', '', '', 'Caribbean'),
(34, 'Super Riders', '', '', 'Rajan Nagarajah', '', 'Tamil'),
(35, 'Titan United', '', '', 'Razwan Iqbal', 'Rinku Singh', 'Mixed'),
(36, 'Verdun Montreal', '', '', 'Puneet Jain', 'Kenneth Pirmal', 'North Indian');
