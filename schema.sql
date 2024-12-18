-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Puzzles table
CREATE TABLE puzzles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rebus_puzzle TEXT NOT NULL,
    answer VARCHAR(255) NOT NULL,
    explanation TEXT NOT NULL,
    difficulty INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scheduled_for DATE UNIQUE
);

-- User Stats table
CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    points INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    total_games INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    daily_challenge_streak INTEGER NOT NULL DEFAULT 0,
    last_play_date DATE
);

-- Achievements table
CREATE TABLE achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    threshold INTEGER NOT NULL
);

-- User Achievements table
CREATE TABLE user_achievements (
    user_id UUID REFERENCES users(id),
    achievement_id VARCHAR(50) REFERENCES achievements(id),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id)
);

-- Game Sessions table
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    puzzle_id UUID REFERENCES puzzles(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    attempts INTEGER NOT NULL DEFAULT 0,
    is_solved BOOLEAN NOT NULL DEFAULT FALSE
);

-- Blog Posts table
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    author_id UUID REFERENCES users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Levels table
CREATE TABLE levels (
    level INTEGER PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    threshold INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_puzzles_scheduled_for ON puzzles(scheduled_for);
CREATE INDEX idx_user_stats_points ON user_stats(points);
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_puzzle_id ON game_sessions(puzzle_id);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);

-- Populate Achievements table
INSERT INTO achievements (id, name, description, threshold)
VALUES 
    ('first_win', 'First Win', 'Win your first game', 1),
    ('streak_5', '5-Day Streak', 'Win 5 games in a row', 5),
    ('streak_10', '10-Day Streak', 'Win 10 games in a row', 10),
    -- Add more achievements as needed

-- Populate Levels table
INSERT INTO levels (level, name, threshold)
SELECT 
    generate_series AS level,
    'Level ' || generate_series AS name,
    floor(500 * pow(1.1, generate_series - 1)) AS threshold
FROM generate_series(1, 1000);

