import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function ToastDemo() {
  const { error, success, warning, info, loginRequired } = useToast();

  return (
    <Card className="p-6 max-w-md mx-auto space-y-4">
      <h3 className="text-lg font-semibold mb-4">Toast Notifications Demo</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="destructive" 
          onClick={() => loginRequired()}
          className="w-full"
        >
          Login Required
        </Button>
        
        <Button 
          variant="destructive" 
          onClick={() => error("Something went wrong!")}
          className="w-full"
        >
          Error Toast
        </Button>
        
        <Button 
          variant="default" 
          onClick={() => success("Operation completed successfully!")}
          className="w-full"
        >
          Success Toast
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => warning("Please check your input.")}
          className="w-full"
        >
          Warning Toast
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={() => info("Here's some helpful information.")}
          className="w-full col-span-2"
        >
          Info Toast
        </Button>
      </div>
      
      <div className="text-sm text-muted-foreground mt-4">
        <p>• Toasts auto-dismiss after 4-5 seconds</p>
        <p>• Click the × button to dismiss manually</p>
        <p>• Positioned at bottom-right on desktop</p>
      </div>
    </Card>
  );
}