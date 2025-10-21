import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Users, ChefHat } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RecipeDetail {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  image_url: string | null;
}

interface RecipeComponent {
  quantity: number;
  unit: string | null;
  ingredient_name: string;
}

const Recipe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [components, setComponents] = useState<RecipeComponent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      await fetchRecipe();
    };
    checkAuthAndLoad();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (recipeError) throw recipeError;
      setRecipe(recipeData);

      const { data: componentsData, error: componentsError } = await supabase
        .from('recipe_components')
        .select(`
          quantity,
          unit,
          ingredients (
            name
          )
        `)
        .eq('recipe_id', id);

      if (componentsError) throw componentsError;

      const formattedComponents = componentsData?.map(c => ({
        quantity: c.quantity,
        unit: c.unit,
        ingredient_name: (c.ingredients as any)?.name || '',
      })) || [];

      setComponents(formattedComponents);
    } catch (error: any) {
      toast.error('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-8" />
          <Skeleton className="h-96 w-full mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-4">Recipe not found</h2>
            <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          {recipe.image_url ? (
            <div className="h-96 rounded-lg overflow-hidden mb-6">
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-96 rounded-lg bg-muted flex items-center justify-center mb-6">
              <ChefHat className="w-24 h-24 text-muted-foreground" />
            </div>
          )}

          <h1 className="text-4xl font-bold mb-4">{recipe.title}</h1>
          {recipe.description && (
            <p className="text-lg text-muted-foreground mb-6">{recipe.description}</p>
          )}

          <div className="flex gap-4 mb-8">
            {recipe.prep_time && recipe.cook_time && (
              <Badge variant="secondary" className="text-base py-2 px-4">
                <Clock className="w-4 h-4 mr-2" />
                {recipe.prep_time + recipe.cook_time} minutes
              </Badge>
            )}
            {recipe.servings && (
              <Badge variant="secondary" className="text-base py-2 px-4">
                <Users className="w-4 h-4 mr-2" />
                {recipe.servings} servings
              </Badge>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {components.map((component, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      {component.quantity} {component.unit || ''} {component.ingredient_name}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.instructions ? (
                <div className="prose prose-sm max-w-none">
                  {recipe.instructions.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-4">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No instructions available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Recipe;
