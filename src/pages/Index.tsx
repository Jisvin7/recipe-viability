import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChefHat, Sparkles, Package, Shield } from 'lucide-react';
import heroImage from '@/assets/hero-food.jpg';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[600px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Delicious food spread"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-accent/80 to-primary/90" />
        </div>
        
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
          <div className="flex items-center gap-3 mb-6">
            <ChefHat className="w-16 h-16 text-white" />
            <h1 className="text-5xl md:text-6xl font-bold text-white">PantryChef</h1>
          </div>
          <p className="text-xl md:text-2xl text-white/95 mb-4 max-w-2xl">
            AI-Powered Recipe Recommendations Based on Your Pantry
          </p>
          <p className="text-lg text-white/80 mb-8 max-w-xl">
            Get personalized recipes that match your ingredients while respecting your dietary restrictions
          </p>
          <div className="flex gap-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6"
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            PantryChef uses intelligent matching to recommend recipes based on what you already have
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Manage Your Pantry</h3>
              <p className="text-muted-foreground">
                Add ingredients you have at home to your virtual pantry
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Smart Recommendations</h3>
              <p className="text-muted-foreground">
                See recipes ranked by V-Score - how many ingredients you already have
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Stay Safe</h3>
              <p className="text-muted-foreground">
                Set dietary restrictions and allergies to filter recipes automatically
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Cook Smarter?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join PantryChef today and discover recipes that match your ingredients
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="text-lg px-8 py-6"
          >
            Start Cooking Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
