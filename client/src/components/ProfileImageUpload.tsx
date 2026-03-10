import React, { useState, useRef, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pencil, Trash2, Upload, X, User } from "lucide-react";

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Allowed file types
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ProfileImageUploadProps {
  className?: string;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({ className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  // Upload image mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest(
        "POST", 
        `/api/users/${user?.id}/profile-image`, 
        formData,
        { isFormData: true }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile image updated successfully.",
      });
      // Invalidate user data query to refresh profile image
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      closePreview();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile image. Please try again.",
        variant: "destructive",
      });
      setError("Upload failed. Please try again.");
    },
  });

  // Remove image mutation
  const removeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "DELETE", 
        `/api/users/${user?.id}/profile-image`
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile image removed successfully.",
      });
      // Invalidate user data query to refresh profile image
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setConfirmRemoveOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove profile image. Please try again.",
        variant: "destructive",
      });
      setConfirmRemoveOpen(false);
    },
  });

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.");
      return;
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File size exceeds limit. Maximum file size is 5MB.");
      return;
    }
    
    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
    setPreviewOpen(true);
    
    // Clean up
    e.target.value = '';
  };

  // Handle upload click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle upload confirmation
  const handleConfirmUpload = () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("profileImage", selectedFile);
    
    uploadMutation.mutate(formData);
  };

  // Close preview and clean up
  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setPreviewOpen(false);
    setIsUploading(false);
    setError(null);
  };

  // Handle remove image
  const handleRemoveImage = () => {
    if (!user?.profileImage) return;
    setConfirmRemoveOpen(true);
  };

  // Confirm remove image
  const confirmRemoveImage = () => {
    removeMutation.mutate();
  };

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Profile Image Display */}
      <div className="relative group">
        <Avatar className="h-24 w-24 border-2 border-gray-800">
          <AvatarImage src={user?.profileImage || undefined} alt="Profile" />
          <AvatarFallback>
            {user?.username ? getInitials(user.username) : <User />}
          </AvatarFallback>
        </Avatar>
        
        {/* Edit overlay on hover */}
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white p-1 h-auto mb-1"
            onClick={handleUploadClick}
            aria-label="Upload profile image"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          {user?.profileImage && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white p-1 h-auto"
              onClick={handleRemoveImage}
              aria-label="Remove profile image"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Upload button below avatar */}
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-3"
        onClick={handleUploadClick}
      >
        <Upload className="h-4 w-4 mr-2" /> Change Profile Picture
      </Button>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/gif,image/webp"
        aria-label="Upload profile image"
      />

      {/* Image preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Image Preview</DialogTitle>
            <DialogDescription>
              Preview your profile image before uploading.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="bg-destructive/20 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}
            {previewUrl && !error && (
            <div className="flex justify-center">
              <img 
                src={previewUrl} 
                alt="Profile preview" 
                className="max-h-[300px] rounded-md object-contain"
                loading="lazy"
              />
            </div>
          )}
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="outline" 
              onClick={closePreview}
              disabled={isUploading}
            >
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            
            <Button 
              onClick={handleConfirmUpload} 
              disabled={!!error || isUploading || !selectedFile}
            >
              <Upload className="h-4 w-4 mr-2" /> 
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm remove dialog */}
      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Profile Picture</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove your profile picture? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setConfirmRemoveOpen(false)}
              disabled={removeMutation.isPending}
            >
              Cancel
            </Button>
            
            <Button 
              variant="destructive"
              onClick={confirmRemoveImage}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileImageUpload;