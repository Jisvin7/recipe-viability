import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, ChefHat, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PantryItem {
  id: string;
  ingredient_id: string;
  quantity: number;
  unit: string | null;
  ingredient_name: string;
  ingredient_category: string | null;
}

interface Ingredient {
  id: string;
  name: string;
  category: string | null;
}

const Pantry = () => {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    await Promise.all([fetchPantryItems(session.user.id), fetchIngredients()]);
    setLoading(false);
  };

  const fetchPantryItems = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_pantry')
        .select(`
          id,
          ingredient_id,
          quantity,
          unit,
          ingredients (
            name,
            category
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const formattedItems = data?.map(item => ({
        id: item.id,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity || 0,
        unit: item.unit,
        ingredient_name: (item.ingredients as any)?.name || '',
        ingredient_category: (item.ingredients as any)?.category || null,
      })) || [];

      setPantryItems(formattedItems);
    } catch (error: any) {
      toast.error('Failed to load pantry items');
    }
  };

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');

      if (error) throw error;
      setIngredients(data || []);
    } catch (error: any) {
      toast.error('Failed to load ingredients');
    }
  };

  const addToPantry = async () => {
    if (!selectedIngredient) {
      toast.error('Please select an ingredient');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_pantry')
        .insert({
          user_id: user.id,
          ingredient_id: selectedIngredient,
          quantity: parseFloat(quantity),
          unit: unit || null,
        });

      if (error) throw error;

      toast.success('Ingredient added to pantry');
      setDialogOpen(false);
      setSelectedIngredient('');
      setQuantity('1');
      setUnit('');
      await fetchPantryItems(user.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add ingredient');
    }
  };

  const removeFromPantry = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('user_pantry')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Ingredient removed from pantry');
      setPantryItems(pantryItems.filter(item => item.id !== itemId));
    } catch (error: any) {
      toast.error('Failed to remove ingredient');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Package className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">My Pantry</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Ingredients</h2>
            <p className="text-muted-foreground">
              Manage what's in your pantry to get better recipe recommendations
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Ingredient
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Pantry</DialogTitle>
                <DialogDescription>
                  Select an ingredient and specify the quantity
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Ingredient</Label>
                  <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ingredient" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} {ing.category && `(${ing.category})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input
                      placeholder="e.g., pieces, kg"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={addToPantry} className="w-full">
                  Add to Pantry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {pantryItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Your pantry is empty</h3>
              <p className="text-muted-foreground mb-4">
                Start adding ingredients to get personalized recipe recommendations
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pantryItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{item.ingredient_name}</CardTitle>
                      {item.ingredient_category && (
                        <Badge variant="secondary" className="mt-2">
                          {item.ingredient_category}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromPantry(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {item.quantity} {item.unit || ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Pantry;
