import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: () => void;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}

const FavoriteButton = ({ isFavorite, onClick, className, size = "icon" }: FavoriteButtonProps) => {
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "hover:bg-transparent",
        className
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-all",
          isFavorite 
            ? "fill-red-500 text-red-500" 
            : "text-muted-foreground hover:text-red-500"
        )}
      />
    </Button>
  );
};

export default FavoriteButton;
