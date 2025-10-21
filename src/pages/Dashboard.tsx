import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Clock, Users, ChefHat, Package, Shield, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RecipeRecommendation {
  id: string;
  title: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  image_url: string | null;
  v_score: number | null;
  missing_ingredients: string[] | null;
  total_ingredients: number | null;
  owned_ingredients: number | null;
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [recipes, setRecipes] = useState<RecipeRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      await fetchRecommendations(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchRecommendations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('recipe_recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('v_score', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error: any) {
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 rounded-t-lg" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">PantryChef</h1>
          </div>
          <nav className="flex gap-4 items-center">
            <Button variant="ghost" onClick={() => navigate('/pantry')}>
              <Package className="w-4 h-4 mr-2" />
              My Pantry
            </Button>
            <Button variant="ghost" onClick={() => navigate('/restrictions')}>
              <Shield className="w-4 h-4 mr-2" />
              Restrictions
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Your Recipe Recommendations</h2>
          <p className="text-muted-foreground">
            Recipes ranked by how many ingredients you already have
          </p>
        </div>

        {recipes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No recipes available yet</h3>
              <p className="text-muted-foreground mb-4">
                Add ingredients to your pantry to see personalized recommendations
              </p>
              <Button onClick={() => navigate('/pantry')}>
                Go to My Pantry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-muted">
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary text-primary-foreground">
                      {recipe.v_score?.toFixed(0)}% Match
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle>{recipe.title}</CardTitle>
                  <CardDescription>{recipe.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Ingredient Match</span>
                      <span className="font-medium">
                        {recipe.owned_ingredients}/{recipe.total_ingredients}
                      </span>
                    </div>
                    <Progress value={recipe.v_score || 0} />
                  </div>
                  
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {recipe.prep_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {recipe.prep_time + (recipe.cook_time || 0)} min
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {recipe.servings} servings
                      </div>
                    )}
                  </div>

                  {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Missing:</p>
                      <div className="flex flex-wrap gap-1">
                        {recipe.missing_ingredients.slice(0, 3).map((ing, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {ing}
                          </Badge>
                        ))}
                        {recipe.missing_ingredients.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{recipe.missing_ingredients.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => navigate(`/recipe/${recipe.id}`)}
                  >
                    View Recipe
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
