-- Users Table (Extends Supabase Auth)
CREATE TABLE users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  rank INT DEFAULT 1000,
  total_games INT DEFAULT 0,
  win_rate FLOAT DEFAULT 0,
  avg_solve_time FLOAT,
  current_streak INT DEFAULT 0,
  highest_streak INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms Table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES users(id),
  difficulty TEXT CHECK (difficulty IN ('EZ', 'Normal', 'Asian')),
  word_length INT,
  attempts_used INT,
  time_limit INT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  target_word TEXT, -- Should be encrypted or hidden from client
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room Players (Junction Table)
CREATE TABLE room_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  join_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finish_time TIMESTAMP WITH TIME ZONE,
  attempts_used INT DEFAULT 0,
  is_correct BOOLEAN DEFAULT FALSE,
  score INT DEFAULT 0,
  UNIQUE(room_id, user_id)
);

-- Realtime Configuration
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
