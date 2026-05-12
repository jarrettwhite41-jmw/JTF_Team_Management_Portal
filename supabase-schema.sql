-- JTF Team Management Portal - Supabase Schema
-- Created for migration from Google Apps Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LOOKUP TABLES (Reference data)
-- ============================================================================

CREATE TABLE show_types (
  show_type_id SERIAL PRIMARY KEY,
  show_type_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE class_levels (
  class_level_id SERIAL PRIMARY KEY,
  level_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crew_duty_types (
  crew_duty_type_id SERIAL PRIMARY KEY,
  duty_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skill_categories (
  skill_category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skills (
  skill_id SERIAL PRIMARY KEY,
  skill_category_id INT NOT NULL,
  skill_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (skill_category_id) REFERENCES skill_categories(skill_category_id)
);

CREATE TABLE storage_locations (
  location_id SERIAL PRIMARY KEY,
  location_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_categories (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CORE ENTITY TABLES
-- ============================================================================

CREATE TABLE personnel (
  personnel_id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  primary_email VARCHAR(255),
  primary_phone VARCHAR(20),
  instagram VARCHAR(255),
  birthday DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_info (
  student_id SERIAL PRIMARY KEY,
  personnel_id INT NOT NULL UNIQUE,
  enrollment_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  current_level_id INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (personnel_id) REFERENCES personnel(personnel_id),
  FOREIGN KEY (current_level_id) REFERENCES class_levels(class_level_id)
);

CREATE TABLE directors (
  director_id SERIAL PRIMARY KEY,
  personnel_id INT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (personnel_id) REFERENCES personnel(personnel_id)
);

CREATE TABLE bartenders (
  bartender_id SERIAL PRIMARY KEY,
  personnel_id INT NOT NULL UNIQUE,
  trained BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'Active',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (personnel_id) REFERENCES personnel(personnel_id)
);

CREATE TABLE alumni (
  alumni_id SERIAL PRIMARY KEY,
  personnel_id INT NOT NULL UNIQUE,
  graduation_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (personnel_id) REFERENCES personnel(personnel_id)
);

-- ============================================================================
-- SHOWS & PERFORMANCES
-- ============================================================================

CREATE TABLE show_information (
  show_id SERIAL PRIMARY KEY,
  show_date DATE NOT NULL,
  show_time TIME,
  show_type_id INT NOT NULL,
  director_id INT,
  venue VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (show_type_id) REFERENCES show_types(show_type_id),
  FOREIGN KEY (director_id) REFERENCES directors(director_id)
);

CREATE TABLE show_performances (
  performance_id SERIAL PRIMARY KEY,
  show_id INT NOT NULL,
  personnel_id INT NOT NULL,
  role VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (show_id) REFERENCES show_information(show_id),
  FOREIGN KEY (personnel_id) REFERENCES personnel(personnel_id)
);

CREATE TABLE crew_duties (
  duty_id SERIAL PRIMARY KEY,
  show_id INT NOT NULL,
  personnel_id INT NOT NULL,
  crew_duty_type_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (show_id) REFERENCES show_information(show_id),
  FOREIGN KEY (personnel_id) REFERENCES personnel(personnel_id),
  FOREIGN KEY (crew_duty_type_id) REFERENCES crew_duty_types(crew_duty_type_id)
);

-- ============================================================================
-- CLASSES & EDUCATION
-- ============================================================================

CREATE TABLE rooms (
  room_id SERIAL PRIMARY KEY,
  room_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teachers (
  teacher_id SERIAL PRIMARY KEY,
  personnel_id INT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (personnel_id) REFERENCES personnel(personnel_id)
);

CREATE TABLE class_offerings (
  offering_id SERIAL PRIMARY KEY,
  class_level_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  teacher_id INT,
  room_id INT,
  max_students INT DEFAULT 12,
  status VARCHAR(50) DEFAULT 'Open',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_level_id) REFERENCES class_levels(class_level_id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id)
);

CREATE TABLE student_enrollments (
  enrollment_id SERIAL PRIMARY KEY,
  offering_id INT NOT NULL,
  student_id INT NOT NULL,
  enrollment_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offering_id) REFERENCES class_offerings(offering_id),
  FOREIGN KEY (student_id) REFERENCES student_info(student_id)
);

CREATE TABLE class_attendance (
  attendance_id SERIAL PRIMARY KEY,
  enrollment_id INT NOT NULL,
  class_date DATE NOT NULL,
  attended BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(enrollment_id)
);

CREATE TABLE class_session_logs (
  session_log_id SERIAL PRIMARY KEY,
  offering_id INT NOT NULL,
  session_date DATE NOT NULL,
  curriculum_notes TEXT,
  group_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offering_id) REFERENCES class_offerings(offering_id)
);

CREATE TABLE student_progress_notes (
  progress_note_id SERIAL PRIMARY KEY,
  enrollment_id INT NOT NULL,
  note_date DATE NOT NULL,
  narrative_feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(enrollment_id)
);

-- ============================================================================
-- STUDENT COMPETENCIES / SKILLS
-- ============================================================================

CREATE TABLE student_competencies (
  competency_id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  enrollment_id INT NOT NULL,
  skill_id INT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  assessed_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student_info(student_id),
  FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(enrollment_id),
  FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
);

CREATE TABLE class_level_progression (
  progression_id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  class_level_id INT NOT NULL,
  completion_date DATE,
  status VARCHAR(50) DEFAULT 'In Progress',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student_info(student_id),
  FOREIGN KEY (class_level_id) REFERENCES class_levels(class_level_id)
);

-- ============================================================================
-- INVENTORY
-- ============================================================================

CREATE TABLE inventory_items (
  item_id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  current_quantity INT DEFAULT 0,
  min_quantity INT DEFAULT 0,
  location_id INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES inventory_categories(category_id),
  FOREIGN KEY (location_id) REFERENCES storage_locations(location_id)
);

CREATE TABLE inventory_transactions (
  transaction_id SERIAL PRIMARY KEY,
  item_id INT NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  quantity_change INT NOT NULL,
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory_items(item_id)
);

-- ============================================================================
-- REHEARSALS & GAMES
-- ============================================================================

CREATE TABLE rehearsals (
  rehearsal_id SERIAL PRIMARY KEY,
  show_id INT,
  rehearsal_date DATE NOT NULL,
  rehearsal_time TIME,
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (show_id) REFERENCES show_information(show_id)
);

CREATE TABLE rehearsal_attendance (
  attendance_id SERIAL PRIMARY KEY,
  rehearsal_id INT NOT NULL,
  personnel_id INT NOT NULL,
  attended BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rehearsal_id) REFERENCES rehearsals(rehearsal_id),
  FOREIGN KEY (personnel_id) REFERENCES personnel(personnel_id)
);

CREATE TABLE master_game_list (
  game_id SERIAL PRIMARY KEY,
  game_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100),
  difficulty_level INT CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE games_played (
  games_played_id SERIAL PRIMARY KEY,
  show_id INT NOT NULL,
  game_id INT NOT NULL,
  order_in_show INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (show_id) REFERENCES show_information(show_id),
  FOREIGN KEY (game_id) REFERENCES master_game_list(game_id)
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

CREATE INDEX idx_personnel_email ON personnel(primary_email);
CREATE INDEX idx_show_information_date ON show_information(show_date);
CREATE INDEX idx_class_offerings_dates ON class_offerings(start_date, end_date);
CREATE INDEX idx_student_enrollments_status ON student_enrollments(status);
CREATE INDEX idx_student_competencies_student ON student_competencies(student_id);
CREATE INDEX idx_inventory_items_location ON inventory_items(location_id);
CREATE INDEX idx_crew_duties_show ON crew_duties(show_id);
