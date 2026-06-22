export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-danish-red border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">{text}</p>
    </div>
  );
}
