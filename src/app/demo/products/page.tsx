import { DynamicProductDemo } from '@/components/DynamicProductDemo';

export default function ProductsDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Dynamic Product System Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            This demo showcases the new dynamic product fetching system that replaces hardcoded product mappings. 
            The system can fetch products directly from the Prodigi API, cache results, and provide intelligent fallbacks.
          </p>
        </div>
        
        <DynamicProductDemo />
      </div>
    </div>
  );
}
