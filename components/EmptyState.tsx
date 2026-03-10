"use client";

export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center p-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
      <p>{message}</p>
    </div>
  );
}
