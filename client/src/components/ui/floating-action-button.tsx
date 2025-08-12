import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, Wallet, CreditCard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  className?: string;
}

export function FloatingActionButton({ actions, className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {/* Action buttons */}
      <div className={cn(
        "flex flex-col gap-3 mb-3 transition-all duration-300",
        isOpen ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
      )}>
        {actions.map((action, index) => (
          <Button
            key={index}
            size="sm"
            variant="secondary"
            className={cn(
              "h-12 w-12 rounded-full shadow-lg transition-all duration-200 hover:scale-110",
              action.color || "bg-white hover:bg-gray-50"
            )}
            onClick={() => {
              action.onClick();
              setIsOpen(false);
            }}
            title={action.label}
            data-testid={`fab-action-${index}`}
          >
            {action.icon}
          </Button>
        ))}
      </div>

      {/* Main FAB button */}
      <Button
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110",
          isOpen ? "rotate-45" : "rotate-0"
        )}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="fab-main-button"
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </Button>
    </div>
  );
}

// Preset FAB for transactions
interface TransactionFABProps {
  onAddTransaction?: () => void;
  onAddAccount?: () => void;
  onAddDebt?: () => void;
  className?: string;
}

export function TransactionFAB({ 
  onAddTransaction, 
  onAddAccount, 
  onAddDebt, 
  className 
}: TransactionFABProps) {
  const actions: FABAction[] = [
    {
      icon: <Receipt size={20} />,
      label: "Add Transaction",
      onClick: onAddTransaction || (() => {}),
      color: "bg-blue-500 hover:bg-blue-600 text-white"
    },
    {
      icon: <Wallet size={20} />,
      label: "Add Account",
      onClick: onAddAccount || (() => {}),
      color: "bg-green-500 hover:bg-green-600 text-white"
    },
    {
      icon: <CreditCard size={20} />,
      label: "Add Debt",
      onClick: onAddDebt || (() => {}),
      color: "bg-red-500 hover:bg-red-600 text-white"
    }
  ];

  return <FloatingActionButton actions={actions} className={className} />;
}