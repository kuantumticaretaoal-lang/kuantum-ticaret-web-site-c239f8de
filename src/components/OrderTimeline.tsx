import { Check, Clock, Package, Truck, Home, X, AlertCircle } from "lucide-react";

interface OrderTimelineProps {
  status: string;
  createdAt: string;
  updatedAt?: string;
  rejectionReason?: string;
}

const statusSteps = [
  { key: 'pending', label: 'Beklemede', icon: Clock },
  { key: 'confirmed', label: 'Onaylandı', icon: Check },
  { key: 'preparing', label: 'Hazırlanıyor', icon: Package },
  { key: 'ready', label: 'Hazır', icon: Package },
  { key: 'in_delivery', label: 'Teslim Edilmek Üzere', icon: Truck },
  { key: 'delivered', label: 'Teslim Edildi', icon: Home },
];

export const OrderTimeline = ({ status, createdAt, updatedAt, rejectionReason }: OrderTimelineProps) => {
  const isRejected = status === 'rejected';
  
  const currentStepIndex = isRejected ? -1 : statusSteps.findIndex(s => s.key === status);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isRejected) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <X className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-red-700 dark:text-red-400">Sipariş Reddedildi</h4>
            {rejectionReason && (
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                {rejectionReason}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{formatDate(updatedAt || createdAt)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {statusSteps.map((step, index) => {
        const isCompleted = index <= currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-start mb-4 last:mb-0">
            {/* Vertical Line */}
            {index < statusSteps.length - 1 && (
              <div 
                className={`absolute left-5 top-10 w-0.5 h-8 -translate-x-1/2 ${
                  index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`}
                style={{ top: `${index * 56 + 40}px` }}
              />
            )}
            
            {/* Icon Circle */}
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                isCompleted 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="ml-4 flex-1">
              <h4 className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </h4>
              {isCurrent && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(status === 'pending' ? createdAt : (updatedAt || createdAt))}
                </p>
              )}
            </div>

            {/* Check mark for completed */}
            {isCompleted && !isCurrent && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
};
