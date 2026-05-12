-- skill_categories
INSERT INTO public.skill_categories (skill_category_id, category_name, description) VALUES
(1, 'Active Listening & Trust', 'IA1 | Overcoming the "internal editor," eliminating denial, and committing to "Yes, And."'),
(2, 'Spacework & Environment', 'IA1 | Defining the physical world and audience location through non-verbal "Object Work."'),
(3, 'Character Mechanics', 'IA1 | Building unique characters via posture, vocal range (no accents), and breathing choices.'),
(4, 'Shortform Execution', 'IA2 | Mastering "Group Pieces" (185, World’s Worst) and "Scenic Pieces" (Alphabet, New Choice).'),
(5, 'Improv "Currency"', 'IA3 | Understanding the value of choices: Verbal ($1), Physical ($10), and Emotional ($1M).'),
(6, 'Solo Performance', 'IA3 | Mastering Color Monologues, Twist Monologues, and making direct eye contact with the audience.'),
(7, 'Heightening & Extending', 'IA3 | Learning to "keep it up" once a pattern or game is established; increasing intensity.'),
(8, 'The "Why" of the Edit', 'IA4 | NAM Principle: Knowing when to exit based on a Natural end, Audience reaction, or Mercy kill.'),
(9, 'Scene Devices', 'IA4 | Incorporating Parallel Scenes, Dueling Monologues, and Human Furniture.'),
(10, 'Pacing (Tempo)', 'IA4 | Shot/Beer/Bordeaux: Varying the length of scenes/monologues to control show energy.'),
(11, 'Source Management', 'IA4 | Using honest conversation (Living Room) or monologues (Armando) to inspire a set.'),
(12, 'Advanced Transitions', 'IA4 | Mastering technical edits like Lassos, Fade Outs, Bolts, and Self-Starts.'),
(13, 'Leading', 'IA4/5 | Driving the Action: Taking initiative to establish the Focus Line and providing the $1M emotional hooks.'),
(14, 'Supporting', 'IA4/5 | Building the Foundation: Validating partner choices through mirroring, endowment, and backline support.'),
(15, 'Show Management', 'IA5 | Managing the "Red Light District" (aggressive heightening) and finding the Focus fast.'),
(16, 'Scenework Diagnostics', 'IA5 | Self-analyzing personal "Dropped Balls" and receiving side-coaching to fix specific weaknesses.'),
(17, 'Technical Proficiency', 'IA5 | Tech Booth Orientation: Understanding how to call lights and sound to support the cast.'),
(18, 'Professional Hosting', 'IA5/6 | Mastering the "Intro" and "Selling it"—hosting, introing games, and calling from the side.'),
(19, 'Group Minded', 'IA6 | Achieving Group Mind where the ensemble moves and reacts as a single unit.'),
(20, 'Ensemble Mastery', 'IA6 | Executing complex formats (Slacker, The Event, LaRonde) with professional-level polish.')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.skill_categories','skill_category_id'), COALESCE((SELECT MAX(skill_category_id) FROM public.skill_categories),1), true);
