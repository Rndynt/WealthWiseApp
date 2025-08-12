import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`w-full max-w-full overflow-hidden ${className}`}>
      <div className="space-y-4 sm:space-y-6">
        {children}
      </div>
    </div>
  );
}

interface CardContainerProps {
  children: ReactNode;
  className?: string;
}

export function CardContainer({ children, className = '' }: CardContainerProps) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      {children}
    </div>
  );
}

interface TableContainerProps {
  children: ReactNode;
  className?: string;
}

export function TableContainer({ children, className = '' }: TableContainerProps) {
  return (
    <div className="w-full overflow-x-auto border rounded-lg">
      <div className="min-w-full inline-block align-middle">
        {children}
      </div>
    </div>
  );
}