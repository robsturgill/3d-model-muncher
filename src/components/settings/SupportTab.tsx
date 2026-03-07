import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Heart, Star, Github } from "lucide-react";
import { ImageWithFallback } from "../ImageWithFallback";

interface SupportTabProps {
  onDonationClick?: () => void;
}

export function SupportTab({ onDonationClick }: SupportTabProps) {
  return (
    <div data-testid="support-tab">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Support 3D Model Muncher
          </CardTitle>
          <CardDescription>
            Help keep this project alive and growing! Your support enables continued development and new features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ways to Support */}
          <div className="space-y-4">
            <h3 className="font-medium">Ways to Support</h3>
            
            <div className="grid gap-4">
              <button
                type="button"
                onClick={onDonationClick}
                aria-label="Donate"
                data-testid="donate-button"
                className="w-full text-left flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20 cursor-pointer transform transition duration-150 ease-in-out hover:scale-105 hover:from-primary/10 hover:to-secondary/10 hover:border-2 hover:border-primary hover:bg-primary/6 dark:hover:border-primary dark: hover:bg-primary/900 hover:ring-2 hover:ring-primary/40 dark:hover:ring-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Financial Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Buy me a coffee or sponsor development through various platforms
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Donate
                </span>
              </button>

              <a
                href="https://github.com/robsturgill/3d-model-muncher"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Star on GitHub"
                data-testid="star-github-link"
                className="w-full text-left flex items-center gap-4 p-4 bg-muted/30 rounded-lg border cursor-pointer transform transition duration-150 ease-in-out hover:scale-105 hover:bg-muted/50 dark:hover:bg-muted/70 hover:border-2 hover:border-primary hover:ring-2 hover:ring-primary/40 dark:hover:ring-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg">
                  <Star className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Star on GitHub</h4>
                  <p className="text-sm text-muted-foreground">
                    Show your appreciation and help others discover the project
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  Star
                </span>
              </a>

              <a
                href="https://github.com/robsturgill/3d-model-muncher"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contribute on GitHub"
                data-testid="contribute-github-link"
                className="w-full text-left flex items-center gap-4 p-4 bg-muted/30 rounded-lg border cursor-pointer transform transition duration-150 ease-in-out hover:scale-105 hover:bg-muted/50 dark:hover:bg-muted/70 hover:border-2 hover:border-primary hover:ring-2 hover:ring-primary/40 dark:hover:ring-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg">
                  <Github className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Contribute Code</h4>
                  <p className="text-sm text-muted-foreground">
                    Help improve the project by contributing code, reporting bugs, or suggesting features
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  Contribute
                </span>
              </a>
            </div>
          </div>

          {/* Community */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <ImageWithFallback
              src="/images/munchie-side.png"
              alt="Community mascot"
              className="w-72 sm:w-[200px] h-auto flex-shrink-0 mx-auto sm:mx-0"
            />                    
            <div className="flex-1 w-full flex flex-col justify-center space-y-3 text-left">
              <h3 className="font-medium">Join the Community</h3>
              <ul className="text-sm text-muted-foreground space-y-2 text-left list-disc list-inside">
                <li>Share your 3D printing projects and experiences</li>
                <li>Get help from fellow makers and developers</li>
                <li>Suggest new features and improvements</li>
                <li>Stay updated on the latest releases</li>
              </ul>
            </div>
          </div>

          <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-primary">Thank you</strong> for using 3D Model Muncher! 
              Your support helps keep this project free and open-source for the entire 3D printing community.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
