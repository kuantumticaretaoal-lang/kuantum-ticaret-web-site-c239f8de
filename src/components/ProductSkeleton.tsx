import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ProductSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="w-full h-48" />
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-8 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
};

export const ProductDetailSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <Skeleton className="h-10 w-32 mb-6" />
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-4">
          <Skeleton className="w-full aspect-square rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/4 mb-4" />
            <Skeleton className="h-12 w-1/3 mb-4" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};
