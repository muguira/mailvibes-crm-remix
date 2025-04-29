
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name, initials, size = "md", className }: AvatarProps) {
  // Generate background color based on name
  const getColor = (name: string) => {
    const colors = [
      'bg-teal-primary',
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-pink-500',
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Extract initials if not provided
  const getInitials = (name: string) => {
    if (initials) return initials;
    
    const nameParts = name.split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
  };
  
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-medium",
        sizeClasses[size],
        getColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
