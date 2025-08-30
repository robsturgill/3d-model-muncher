import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Heart, Coffee, Github, CreditCard, Gift, ExternalLink, Star } from "lucide-react";

interface DonationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DonationPlatform {
  name: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  suggested?: string;
  popular?: boolean;
}

export function DonationDialog({ isOpen, onClose }: DonationDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const donationPlatforms: DonationPlatform[] = [
    {
      name: "GitHub Sponsors",
      description: "Support ongoing development through GitHub's platform",
      icon: <Github className="h-5 w-5" />,
      url: "https://github.com/sponsors/3d-model-muncher",
      suggested: "$5/month",
      popular: true
    },
    {
      name: "Ko-fi",
      description: "Buy me a coffee to fuel late-night coding sessions",
      icon: <Coffee className="h-5 w-5" />,
      url: "https://ko-fi.com/3dmodelmuncher",
      suggested: "$3"
    },
    {
      name: "PayPal",
      description: "One-time donation via PayPal",
      icon: <CreditCard className="h-5 w-5" />,
      url: "https://paypal.me/3dmodelmuncher",
      suggested: "$10"
    },
    {
      name: "Buy Me a Coffee",
      description: "Show appreciation with a virtual coffee",
      icon: <Gift className="h-5 w-5" />,
      url: "https://buymeacoffee.com/3dmodelmuncher",
      suggested: "$5"
    }
  ];

  const handlePlatformClick = (platform: DonationPlatform) => {
    setSelectedPlatform(platform.name);
    // In a real app, this would open the donation URL
    window.open(platform.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-auto max-h-[95vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-xl shadow-lg">
              <Heart className="h-8 w-8 text-white" />
            </div>
            
            <div className="space-y-2">
              <DialogTitle className="text-xl sm:text-2xl font-semibold text-card-foreground">
                Support 3D Model Muncher
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Help keep this project alive and growing! Your support enables continued development and new features.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="space-y-6">
            {/* Project Stats */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
              <div className="text-center">
                <div className="font-semibold text-base sm:text-lg text-primary">1.2k+</div>
                <div className="text-xs text-muted-foreground">Users</div>
              </div>
              <Separator orientation="vertical" className="h-6 sm:h-8" />
              <div className="text-center">
                <div className="font-semibold text-base sm:text-lg text-primary">Free</div>
                <div className="text-xs text-muted-foreground">Always</div>
              </div>
              <Separator orientation="vertical" className="h-6 sm:h-8" />
              <div className="text-center">
                <div className="font-semibold text-base sm:text-lg text-primary">Open</div>
                <div className="text-xs text-muted-foreground">Source</div>
              </div>
            </div>

            {/* Donation Platforms */}
            <div className="space-y-3">
              <h3 className="font-medium text-card-foreground text-sm sm:text-base">Choose your preferred platform:</h3>
              
              <div className="space-y-2 sm:space-y-3">
                {donationPlatforms.map((platform) => (
                  <Button
                    key={platform.name}
                    variant="outline"
                    className="w-full h-auto p-3 sm:p-4 justify-start hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                    onClick={() => handlePlatformClick(platform)}
                  >
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors shrink-0">
                        {platform.icon}
                      </div>
                      
                      <div className="flex-1 text-left space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm sm:text-base">{platform.name}</span>
                          {platform.popular && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              <Star className="h-2.5 w-2.5 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-tight">
                          {platform.description}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {platform.suggested && (
                          <Badge variant="outline" className="text-xs">
                            {platform.suggested}
                          </Badge>
                        )}
                        <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Alternative Support */}
            <div className="space-y-3">
              <h3 className="font-medium text-card-foreground text-sm sm:text-base">Other ways to help:</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary shrink-0" />
                  <span>Star the project on GitHub</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary shrink-0" />
                  <span>Share with fellow 3D printing enthusiasts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-primary shrink-0" />
                  <span>Contribute code or report issues</span>
                </div>
              </div>
            </div>

            {/* Thank You Message */}
            <div className="text-center p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-primary">Thank you</strong> for considering supporting 3D Model Muncher! 
                Every contribution, no matter the size, helps keep this project thriving for the entire community.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-background px-6 py-4 shrink-0">
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 text-sm sm:text-base">
              Maybe Later
            </Button>
            <Button 
              onClick={() => handlePlatformClick(donationPlatforms[0])} 
              className="flex-1 gap-2 text-sm sm:text-base"
            >
              <Heart className="h-4 w-4" />
              Support Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}