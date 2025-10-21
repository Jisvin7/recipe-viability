-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create ingredients table
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on ingredients (readable by all authenticated users)
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ingredients"
  ON public.ingredients FOR SELECT
  TO authenticated
  USING (true);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recipes"
  ON public.recipes FOR SELECT
  TO authenticated
  USING (true);

-- Create user_pantry table
CREATE TABLE public.user_pantry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, ingredient_id)
);

-- Enable RLS on user_pantry
ALTER TABLE public.user_pantry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pantry"
  ON public.user_pantry FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pantry items"
  ON public.user_pantry FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pantry items"
  ON public.user_pantry FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pantry items"
  ON public.user_pantry FOR DELETE
  USING (auth.uid() = user_id);

-- Create recipe_components (ingredients needed for recipes)
CREATE TABLE public.recipe_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT,
  UNIQUE(recipe_id, ingredient_id)
);

-- Enable RLS on recipe_components
ALTER TABLE public.recipe_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recipe components"
  ON public.recipe_components FOR SELECT
  TO authenticated
  USING (true);

-- Create user_restrictions table (dietary restrictions and allergies)
CREATE TABLE public.user_restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('allergy', 'dietary')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, ingredient_id)
);

-- Enable RLS on user_restrictions
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own restrictions"
  ON public.user_restrictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own restrictions"
  ON public.user_restrictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own restrictions"
  ON public.user_restrictions FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create view for recipe recommendations with V-Score
-- This calculates the viability score as (owned ingredients / total ingredients)
-- and filters out recipes containing restricted ingredients
CREATE OR REPLACE VIEW public.recipe_recommendations AS
SELECT 
  r.id,
  r.title,
  r.description,
  r.instructions,
  r.prep_time,
  r.cook_time,
  r.servings,
  r.image_url,
  up.user_id,
  -- Calculate V-Score: ratio of owned ingredients to total ingredients
  ROUND(
    CAST(COUNT(DISTINCT up.ingredient_id) AS DECIMAL) / 
    NULLIF(COUNT(DISTINCT rc.ingredient_id), 0) * 100, 
    2
  ) AS v_score,
  -- List of missing ingredients
  ARRAY_AGG(
    DISTINCT CASE 
      WHEN up.ingredient_id IS NULL 
      THEN i.name 
      ELSE NULL 
    END
  ) FILTER (WHERE up.ingredient_id IS NULL) AS missing_ingredients,
  -- Count of total and owned ingredients
  COUNT(DISTINCT rc.ingredient_id) AS total_ingredients,
  COUNT(DISTINCT up.ingredient_id) AS owned_ingredients
FROM public.recipes r
INNER JOIN public.recipe_components rc ON r.id = rc.recipe_id
INNER JOIN public.ingredients i ON rc.ingredient_id = i.id
CROSS JOIN public.profiles p -- Cross join to get all users
LEFT JOIN public.user_pantry up ON 
  rc.ingredient_id = up.ingredient_id AND 
  p.id = up.user_id
-- Exclude recipes with restricted ingredients
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.user_restrictions ur
  WHERE ur.user_id = p.id 
  AND ur.ingredient_id = rc.ingredient_id
)
GROUP BY r.id, r.title, r.description, r.instructions, r.prep_time, r.cook_time, r.servings, r.image_url, up.user_id
HAVING COUNT(DISTINCT rc.ingredient_id) > 0;

-- Insert sample ingredients
INSERT INTO public.ingredients (name, category) VALUES
('Chicken Breast', 'Protein'),
('Tomato', 'Vegetable'),
('Onion', 'Vegetable'),
('Garlic', 'Vegetable'),
('Olive Oil', 'Oil'),
('Salt', 'Seasoning'),
('Black Pepper', 'Seasoning'),
('Pasta', 'Grain'),
('Rice', 'Grain'),
('Eggs', 'Protein'),
('Milk', 'Dairy'),
('Cheese', 'Dairy'),
('Bell Pepper', 'Vegetable'),
('Carrot', 'Vegetable'),
('Potato', 'Vegetable'),
('Flour', 'Grain'),
('Sugar', 'Sweetener'),
('Butter', 'Dairy'),
('Basil', 'Herb'),
('Oregano', 'Herb');

-- Insert sample recipes
INSERT INTO public.recipes (title, description, instructions, prep_time, cook_time, servings, image_url) VALUES
('Classic Chicken Pasta', 'A delicious pasta dish with tender chicken and vegetables', 'Cook pasta. Sauté chicken with vegetables. Mix together with olive oil and herbs.', 15, 25, 4, 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9'),
('Vegetable Stir Fry', 'Healthy and colorful vegetable medley', 'Chop all vegetables. Heat oil in wok. Stir fry vegetables with garlic and seasonings.', 10, 15, 3, 'https://images.unsplash.com/photo-1512058564366-18510be2db19'),
('Cheese Omelette', 'Fluffy eggs with melted cheese', 'Beat eggs. Pour into heated pan. Add cheese and fold.', 5, 10, 2, 'https://images.unsplash.com/photo-1525351484163-7529414344d8');

-- Link ingredients to recipes
-- Classic Chicken Pasta ingredients
INSERT INTO public.recipe_components (recipe_id, ingredient_id, quantity, unit)
SELECT r.id, i.id, q.quantity, q.unit
FROM public.recipes r
CROSS JOIN (VALUES 
  ('Chicken Breast', 2, 'pieces'),
  ('Pasta', 300, 'grams'),
  ('Tomato', 3, 'pieces'),
  ('Onion', 1, 'piece'),
  ('Garlic', 3, 'cloves'),
  ('Olive Oil', 2, 'tbsp'),
  ('Salt', 1, 'tsp'),
  ('Black Pepper', 0.5, 'tsp'),
  ('Basil', 5, 'leaves')
) AS q(name, quantity, unit)
INNER JOIN public.ingredients i ON i.name = q.name
WHERE r.title = 'Classic Chicken Pasta';

-- Vegetable Stir Fry ingredients
INSERT INTO public.recipe_components (recipe_id, ingredient_id, quantity, unit)
SELECT r.id, i.id, q.quantity, q.unit
FROM public.recipes r
CROSS JOIN (VALUES 
  ('Bell Pepper', 2, 'pieces'),
  ('Carrot', 2, 'pieces'),
  ('Onion', 1, 'piece'),
  ('Garlic', 2, 'cloves'),
  ('Olive Oil', 2, 'tbsp'),
  ('Salt', 1, 'tsp'),
  ('Black Pepper', 0.5, 'tsp')
) AS q(name, quantity, unit)
INNER JOIN public.ingredients i ON i.name = q.name
WHERE r.title = 'Vegetable Stir Fry';

-- Cheese Omelette ingredients
INSERT INTO public.recipe_components (recipe_id, ingredient_id, quantity, unit)
SELECT r.id, i.id, q.quantity, q.unit
FROM public.recipes r
CROSS JOIN (VALUES 
  ('Eggs', 3, 'pieces'),
  ('Cheese', 50, 'grams'),
  ('Milk', 50, 'ml'),
  ('Butter', 1, 'tbsp'),
  ('Salt', 0.5, 'tsp'),
  ('Black Pepper', 0.25, 'tsp')
) AS q(name, quantity, unit)
INNER JOIN public.ingredients i ON i.name = q.name
WHERE r.title = 'Cheese Omelette';