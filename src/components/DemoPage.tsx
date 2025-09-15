import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ArrowLeft, Search, Star, Download, Settings, AlertCircle, CheckCircle, Info, X } from "lucide-react";

interface DemoPageProps {
  onBack: () => void;
}

export function DemoPage({ onBack }: DemoPageProps) {
  const [sliderValue, setSliderValue] = useState([50]);
  const [progressValue] = useState(75);
  const [switchValue, setSwitchValue] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(false);

  // Color palette data
  const colorPalette = [
    { name: "Primary", var: "--brand-primary", hex: "#4b0082", description: "Main brand color" },
    { name: "Secondary", var: "--brand-secondary", hex: "#7c3aed", description: "Secondary brand color" },
    { name: "White", var: "--brand-white", hex: "#ffffff", description: "Pure white" },
    { name: "Dark", var: "--brand-dark", hex: "#1a1625", description: "Dark surfaces" },
    { name: "Dark Background", var: "--brand-dark-bg", hex: "#0f0a1a", description: "Dark theme background" },
    { name: "Muted Dark", var: "--brand-muted-dark", hex: "#2d1b4e", description: "Muted dark elements" },
    { name: "Accent Light", var: "--brand-accent-light", hex: "#ede8f5", description: "Light accent color" },
    { name: "Light Background", var: "--brand-light-bg", hex: "#f3f1f7", description: "Light theme surfaces" },
    { name: "Border Light", var: "--brand-border-light", hex: "#e8e4f0", description: "Light theme borders" },
    { name: "Purple Light", var: "--brand-purple-light", hex: "#a855f7", description: "Light purple variant" },
    { name: "Purple Lightest", var: "--brand-purple-lightest", hex: "#c084fc", description: "Lightest purple" },
    { name: "Purple Pale", var: "--brand-purple-pale", hex: "#ddd6fe", description: "Very pale purple" },
  ];

  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="p-6 max-w-7xl mx-auto space-y-12">
          {/* Header */}
          <div className="flex items-center gap-4 pb-6 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">UI Component Demo</h1>
              <p className="text-muted-foreground">3D Model Muncher Design System</p>
            </div>
          </div>

          {/* Typography Section */}
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Typography</CardTitle>
                <CardDescription>Text styles and hierarchy used throughout the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <h1>Heading 1 - Main Titles</h1>
                      <p className="text-xs text-muted-foreground">text-2xl, font-medium</p>
                    </div>
                    <div>
                      <h2>Heading 2 - Section Titles</h2>
                      <p className="text-xs text-muted-foreground">text-xl, font-medium</p>
                    </div>
                    <div>
                      <h3>Heading 3 - Subsections</h3>
                      <p className="text-xs text-muted-foreground">text-lg, font-medium</p>
                    </div>
                    <div>
                      <h4>Heading 4 - Card Titles</h4>
                      <p className="text-xs text-muted-foreground">text-base, font-medium</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p>Body text - Regular paragraph content used for descriptions and general text content.</p>
                      <p className="text-xs text-muted-foreground">text-base, font-normal</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Small text - Used for metadata, captions, and secondary information.</p>
                      <p className="text-xs text-muted-foreground">text-sm, text-muted-foreground</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Extra small text - File sizes, timestamps, and minimal details.</p>
                      <p className="text-xs text-muted-foreground">text-xs, text-muted-foreground</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Color Palette Section */}
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Color Palette</CardTitle>
                <CardDescription>Core brand colors and their CSS custom property aliases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {colorPalette.map((color) => (
                    <div key={color.name} className="space-y-2">
                      <div 
                        className="h-16 rounded-lg border shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">{color.name}</h4>
                        <p className="text-xs text-muted-foreground">{color.description}</p>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{color.hex}</code>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono block">{color.var}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Buttons Section */}
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>Interactive button components with different variants and sizes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-3">Variants</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button>Primary</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="destructive">Destructive</Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-3">Sizes</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="sm">Small</Button>
                      <Button>Default</Button>
                      <Button size="lg">Large</Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-3">With Icons</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                      <Button variant="ghost">
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Form Components Section */}
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Components</CardTitle>
                <CardDescription>Input fields, selectors, and form controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="demo-input">Text Input</Label>
                      <Input id="demo-input" placeholder="Enter text here..." />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="demo-search">Search Input</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="demo-search" placeholder="Search models..." className="pl-10" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="demo-select">Select Dropdown</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="option1">Option 1</SelectItem>
                          <SelectItem value="option2">Option 2</SelectItem>
                          <SelectItem value="option3">Option 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="demo-textarea">Textarea</Label>
                      <Textarea id="demo-textarea" placeholder="Enter longer text..." />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label>Switch</Label>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={switchValue} 
                          onCheckedChange={(v) => setSwitchValue(Boolean(v))}
                          id="demo-switch" 
                        />
                        <Label htmlFor="demo-switch">Enable notifications</Label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Checkbox</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={checkboxValue}
                          onCheckedChange={(v) => setCheckboxValue(Boolean(v))}
                          id="demo-checkbox" 
                        />
                        <Label htmlFor="demo-checkbox">I agree to the terms</Label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Radio Group</Label>
                      <RadioGroup defaultValue="option1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="option1" id="radio1" />
                          <Label htmlFor="radio1">Option 1</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="option2" id="radio2" />
                          <Label htmlFor="radio2">Option 2</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3">
                      <Label>Slider</Label>
                      <Slider
                        value={sliderValue}
                        onValueChange={setSliderValue}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-sm text-muted-foreground">Value: {sliderValue[0]}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Badges and Progress Section */}
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Badges & Progress</CardTitle>
                <CardDescription>Status indicators, tags, and progress visualization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-3">Badge Variants</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge>Default</Badge>
                      <Badge variant="secondary">Secondary</Badge>
                      <Badge variant="outline">Outline</Badge>
                      <Badge variant="destructive">Destructive</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="mb-3">Status Badges</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-green-700 hover:bg-green-600">✓ Printed</Badge>
                      <Badge variant="secondary">○ Not Printed</Badge>
                      <Badge variant="outline">Miniature</Badge>
                      <Badge variant="outline">Fantasy</Badge>
                      <Badge variant="outline">Dragon</Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-3">Progress Bar</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{progressValue}%</span>
                      </div>
                      <Progress value={progressValue} className="w-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Cards and Avatars Section */}
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cards & Avatars</CardTitle>
                <CardDescription>Content containers and user representation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Example Model Card</CardTitle>
                      <CardDescription>A sample 3D model card layout</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="aspect-video bg-gradient-secondary rounded-lg flex items-center justify-center">
                        <p className="text-white font-medium">Model Preview</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4>Dragon Miniature</h4>
                          <Badge>Printed</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Detailed dragon miniature perfect for tabletop gaming.
                        </p>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">Fantasy</Badge>
                          <Badge variant="outline" className="text-xs">Dragon</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <div>
                      <h4 className="mb-3">Avatar Sizes</h4>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src="https://github.com/shadcn.png" />
                          <AvatarFallback>SM</AvatarFallback>
                        </Avatar>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src="https://github.com/shadcn.png" />
                          <AvatarFallback>MD</AvatarFallback>
                        </Avatar>
                        <Avatar className="w-12 h-12">
                          <AvatarImage src="https://github.com/shadcn.png" />
                          <AvatarFallback>LG</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3">Separators</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm">Horizontal separator</p>
                          <Separator className="my-2" />
                          <p className="text-sm">Content after separator</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Alerts Section */}
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alerts</CardTitle>
                <CardDescription>Information and status messages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Information</AlertTitle>
                  <AlertDescription>
                    This is an informational message about the system status.
                  </AlertDescription>
                </Alert>

                <Alert className="border-green-500 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    Model has been successfully uploaded and processed.
                  </AlertDescription>
                </Alert>

                <Alert className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This model may require supports for optimal printing.
                  </AlertDescription>
                </Alert>

                <Alert variant="destructive" className="border-red-500 text-red-700 dark:text-red-400">
                  <X className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load 3D model. Please check the file format.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </section>

          {/* Tabs Section */}
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tabs</CardTitle>
                <CardDescription>Tabbed navigation with hover and active states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="mb-4">Tab States Demo</h4>
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="mt-6">
                      <div className="p-6 bg-muted/50 rounded-lg">
                        <h5 className="font-medium mb-2">Overview Tab Content</h5>
                        <p className="text-sm text-muted-foreground mb-4">
                          This tab is currently <strong>active</strong>. Try hovering over the other tabs to see the hover state.
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Models:</span>
                            <span>1,234</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Printed:</span>
                            <span>856</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Categories:</span>
                            <span>12</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="details" className="mt-6">
                      <div className="p-6 bg-muted/50 rounded-lg">
                        <h5 className="font-medium mb-2">Details Tab Content</h5>
                        <p className="text-sm text-muted-foreground mb-4">
                          The Details tab is now <strong>active</strong>. Notice how the tab styling changes to indicate the current selection.
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Storage Used:</span>
                            <p className="text-muted-foreground">2.4 GB</p>
                          </div>
                          <div>
                            <span className="font-medium">Last Sync:</span>
                            <p className="text-muted-foreground">5 minutes ago</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="settings" className="mt-6">
                      <div className="p-6 bg-muted/50 rounded-lg">
                        <h5 className="font-medium mb-2">Settings Tab Content</h5>
                        <p className="text-sm text-muted-foreground mb-4">
                          The Settings tab demonstrates the <strong>active state</strong>. The cursor pointer and hover effects help users understand tab interactivity.
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="demo-notifications">Enable notifications</Label>
                            <Switch id="demo-notifications" />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="demo-auto-backup">Auto backup</Label>
                            <Switch id="demo-auto-backup" defaultChecked />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="p-4 bg-accent/20 rounded-lg">
                  <h4 className="font-medium mb-2">State Documentation</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div><strong>Normal:</strong> Default tab appearance with cursor pointer</div>
                    <div><strong>Hover:</strong> Subtle background change when mouse hovers over inactive tabs</div>
                    <div><strong>Active:</strong> Selected tab with distinct background and styling</div>
                    <div><strong>Focus:</strong> Keyboard navigation support with visible focus rings</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Interactive Examples */}
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Interactive Examples</CardTitle>
                <CardDescription>Components with state and interaction patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4>Model Rating</h4>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          className="h-5 w-5 fill-yellow-400 text-yellow-400 cursor-pointer hover:scale-110 transition-transform"
                        />
                      ))}
                      <span className="ml-2 text-sm text-muted-foreground">(4.8)</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4>Print Status Toggle</h4>
                    <div className="flex items-center gap-3">
                      <Badge variant={switchValue ? "default" : "secondary"}>
                        {switchValue ? "✓ Printed" : "○ Not Printed"}
                      </Badge>
                      <Switch 
                        checked={switchValue} 
                        onCheckedChange={setSwitchValue}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Footer */}
          <div className="pt-12 pb-6 text-center text-sm text-muted-foreground">
            3D Model Muncher Design System • All components use semantic color tokens for theme compatibility
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}