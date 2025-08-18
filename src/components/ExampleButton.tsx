// src/components/ExampleButton.tsx
"use client";

import { Button } from "@/components/ui/button";

export default function ExampleButton({ children }: { children?: React.ReactNode }) {
  return (
    <Button onClick={() => console.log("버튼 클릭됨!")}>
      {children ?? "Click Me"}
    </Button>
  );
}
