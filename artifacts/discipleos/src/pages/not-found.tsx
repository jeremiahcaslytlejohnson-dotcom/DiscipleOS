import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="discipleos-shell min-h-[100dvh] text-white">
      <div className="discipleos-content flex min-h-[100dvh] items-center justify-center py-8">
          <Card className="discipleos-functional-surface w-full max-w-md text-white">
          <CardContent className="p-5 sm:p-6">
          <div className="discipleos-section-heading mb-4 items-start">
            <AlertCircle className="discipleos-section-heading__icon mt-0.5 h-8 w-8" />
            <h1 className="min-w-0 break-words text-2xl font-bold text-white">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-white/60">
            Did you forget to add the page to the router?
          </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
