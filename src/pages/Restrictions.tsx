import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Restriction {
  id: string;
  ingredient_id: string;
  restriction_type: 'allergy' | 'dietary';
  notes: string | null;
  ingredient_name: string;
  ingredient_category: string | null;
}

interface Ingredient {
  id: string;
  name: string;
  category: string | null;
}

const Restrictions = () => {
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [restrictionType, setRestrictionType] = useState<'allergy' | 'dietary'>('allergy');
  const [notes, setNotes] = useState('');
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
    await Promise.all([fetchRestrictions(session.user.id), fetchIngredients()]);
    setLoading(false);
  };

  const fetchRestrictions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_restrictions')
        .select(`
          id,
          ingredient_id,
          restriction_type,
          notes,
          ingredients (
            name,
            category
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const formattedRestrictions = data?.map(item => ({
        id: item.id,
        ingredient_id: item.ingredient_id,
        restriction_type: item.restriction_type as 'allergy' | 'dietary',
        notes: item.notes,
        ingredient_name: (item.ingredients as any)?.name || '',
        ingredient_category: (item.ingredients as any)?.category || null,
      })) || [];

      setRestrictions(formattedRestrictions);
    } catch (error: any) {
      toast.error('Failed to load restrictions');
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

  const addRestriction = async () => {
    if (!selectedIngredient) {
      toast.error('Please select an ingredient');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_restrictions')
        .insert({
          user_id: user.id,
          ingredient_id: selectedIngredient,
          restriction_type: restrictionType,
          notes: notes || null,
        });

      if (error) throw error;

      toast.success('Restriction added successfully');
      setDialogOpen(false);
      setSelectedIngredient('');
      setRestrictionType('allergy');
      setNotes('');
      await fetchRestrictions(user.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add restriction');
    }
  };

  const removeRestriction = async (restrictionId: string) => {
    try {
      const { error } = await supabase
        .from('user_restrictions')
        .delete()
        .eq('id', restrictionId);

      if (error) throw error;

      toast.success('Restriction removed');
      setRestrictions(restrictions.filter(r => r.id !== restrictionId));
    } catch (error: any) {
      toast.error('Failed to remove restriction');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const allergies = restrictions.filter(r => r.restriction_type === 'allergy');
  const dietary = restrictions.filter(r => r.restriction_type === 'dietary');

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
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">Dietary Restrictions</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Restrictions & Allergies</h2>
            <p className="text-muted-foreground">
              Manage your dietary restrictions to filter recipes safely
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Restriction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Restriction</DialogTitle>
                <DialogDescription>
                  Specify an ingredient to avoid in your recipes
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
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={restrictionType}
                    onValueChange={(value) => setRestrictionType(value as 'allergy' | 'dietary')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allergy">Allergy</SelectItem>
                      <SelectItem value="dietary">Dietary Preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <Button onClick={addRestriction} className="w-full">
                  Add Restriction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Allergies
            </h3>
            {allergies.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No allergies added
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allergies.map((restriction) => (
                  <Card key={restriction.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{restriction.ingredient_name}</CardTitle>
                          {restriction.ingredient_category && (
                            <Badge variant="secondary" className="mt-2">
                              {restriction.ingredient_category}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRestriction(restriction.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    {restriction.notes && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{restriction.notes}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-secondary" />
              Dietary Preferences
            </h3>
            {dietary.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No dietary preferences added
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {dietary.map((restriction) => (
                  <Card key={restriction.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{restriction.ingredient_name}</CardTitle>
                          {restriction.ingredient_category && (
                            <Badge variant="secondary" className="mt-2">
                              {restriction.ingredient_category}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRestriction(restriction.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    {restriction.notes && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{restriction.notes}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Restrictions;
